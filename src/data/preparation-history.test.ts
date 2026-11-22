import 'fake-indexeddb/auto';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { applyMutation, emptyCollection, newEntity } from '../domain/collection';
import { makeSession, historicalParameters, type Preparation, type PreparationParameterInput } from '../domain/preparation';
import { BrewClock } from '../domain/brew-clock';
import { journeySummary, journeyTimeline, evaluationSeries, type Reflection } from '../domain/journey';
import { coffeeExperiences, coffeeObservations, comparisonPreparations, configurationHypothesis, recurringSensations, sensoryProfile, profileAssociations, associatedReflectionCoffee } from '../domain/discoveries';
import { photoIsReferenced } from '../domain/photo-references';
import { emptyHistoryFilters, historyRows } from '../features/preparations/history-view';
import { IndexedDBStorage } from './indexeddb-storage';
import { validateStorage, type LocalStorage } from '../domain/local-storage';

const native = vi.hoisted(() => ({ open: vi.fn(), execute: vi.fn(), query: vi.fn(), run: vi.fn(), beginTransaction: vi.fn(), commitTransaction: vi.fn(), rollbackTransaction: vi.fn() }));
vi.mock('@capacitor-community/sqlite', () => ({ CapacitorSQLite: {}, SQLiteConnection: class {
  addUpgradeStatement = async () => {}; checkConnectionsConsistency = async () => ({ result: false });
  isConnection = async () => ({ result: false }); createConnection = async () => native; closeConnection = async () => {};
} }));
import { SQLiteStorage } from './sqlite-storage';

async function withStorage(engine: string, test: (local: LocalStorage, sql?: DatabaseSync) => Promise<void>) {
  let sql: DatabaseSync | undefined;
  if (engine === 'sqlite') {
    sql = new DatabaseSync(':memory:');
    native.open.mockResolvedValue(undefined);
    native.execute.mockImplementation(async (text: string) => { sql!.exec(text); return {}; });
    native.query.mockImplementation(async (text: string, values: (string | number | null)[] = []) => ({ values: sql!.prepare(text).all(...values) }));
    native.run.mockImplementation(async (text: string, values: (string | number | null)[] = []) => ({ changes: sql!.prepare(text).run(...values) }));
    native.beginTransaction.mockImplementation(async () => { sql!.exec('BEGIN'); });
    native.commitTransaction.mockImplementation(async () => { sql!.exec('COMMIT'); });
    native.rollbackTransaction.mockImplementation(async () => { sql!.exec('ROLLBACK'); });
  }
  const local = engine === 'sqlite' ? new SQLiteStorage() : new IndexedDBStorage(`history-${crypto.randomUUID()}`);
  try { await validateStorage(local); await test(local, sql); } finally { await local.close(); sql?.close(); }
}
async function seed(local: LocalStorage) {
  const method = { ...newEntity(), name: 'V60' };
  const a = { ...newEntity(), name: 'Café A', photoId: 'photo-a', tried: true, favorite: false };
  const b = { ...newEntity(), name: 'Café B', photoId: 'photo-b', tried: false, favorite: false };
  await local.mutateCollection({ type: 'method', value: method });
  for (const value of [a, b]) await local.mutateCollection({ type: 'coffee', value });
  const packet = { ...newEntity(), coffeeId: a.id, initialWeight: 250, remainingWeight: 250, adjustments: [] };
  await local.mutateCollection({ type: 'package', value: packet });
  const entity = newEntity();
  const recipe = { ...entity, familyId: entity.id, name: 'Receita original', version: 1, methodId: method.id, coffeeId: a.id, dose: 20, water: 300, temperature: 92, grind: '27/40', estimatedSeconds: 180,
    steps: [{ id: 'pour', order: 0, name: 'Despejo', type: 'pour' as const, water: 300, cumulativeWater: 300, durationSeconds: 180, advance: 'manual' as const }] };
  await local.mutateCollection({ type: 'recipe', value: recipe });
  const ids: string[] = [];
  for (const [index, coffee] of [a, a, b].entries()) {
    const session = makeSession(await local.loadCollection(), recipe, coffee.id, coffee.id === a.id ? packet.id : undefined, Date.parse('2026-11-20T12:00:00Z') + index * 3600000);
    await local.mutateCollection({ type: 'startSession', value: session });
    const preparation = new BrewClock(session, 0).preparation('completed', 'Minha observação', false, 180000, Date.parse(session.startedAt) + 180000);
    await local.mutateCollection({ type: 'finishPreparation', value: preparation });
    await local.mutateCollection({ type: 'evaluatePreparation', id: preparation.id, value: { overall: index === 0 ? 9 : 0, acidity: index === 0 ? 0 : undefined, tags: ['Cítrico'], createdAt: preparation.finishedAt, updatedAt: preparation.finishedAt } });
    ids.push(preparation.id);
  }
  const reflection: Reflection = { ...newEntity(), occurredOn: '2026-11-20', title: 'Memória', text: 'Texto pessoal que deve sobreviver.', category: 'Aprendizado', featured: true, association: { kind: 'preparation', id: ids[0] } };
  await local.mutateCollection({ type: 'reflection', value: reflection });
  return { a, b, recipe, packet, ids, reflection, before: await local.loadCollection() };
}
function input(p: Preparation): PreparationParameterInput {
  const r = p.snapshot.recipe;
  return { coffeeId: p.snapshot.coffee?.id, dose: r.dose, water: r.water, temperature: r.temperature, grind: r.grind, grinder: r.grinder, filter: r.filter };
}

describe.each(['indexeddb', 'sqlite'])('gerenciamento histórico — %s', engine => {
  it('corrige os parâmetros atomicamente e preserva origem, execução, avaliação, estoque e outros registros após reabrir', async () => withStorage(engine, async local => {
    const { a, b, ids, before, recipe } = await seed(local); const p = before.preparations.find(p => p.id === ids[0])!;
    const value = { ...input(p), coffeeId: b.id, dose: 18, water: 324, temperature: 95, grind: '31/60', grinder: 'Moedor B', filter: 'Papel' };
    await local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value });
    await local.close(); await validateStorage(local);
    let loaded = await local.loadCollection(); const saved = loaded.preparations.find(item => item.id === p.id)!;
    expect(saved.snapshot.coffee).toEqual(before.coffees.find(c => c.id === b.id));
    expect(saved.snapshot.recipe).toMatchObject({ id: recipe.id, familyId: recipe.id, version: 1, coffeeId: a.id, dose: 18, water: 324, temperature: 95, grind: '31/60', grinder: 'Moedor B', filter: 'Papel', estimatedSeconds: 180, steps: p.snapshot.recipe.steps });
    expect(saved).toMatchObject({ id: p.id, createdAt: p.createdAt, startedAt: p.startedAt, finishedAt: p.finishedAt, elapsedMs: p.elapsedMs, executions: p.executions, consumedGrams: p.consumedGrams, evaluation: p.evaluation, snapshot: { packet: p.snapshot.packet } });
    expect(saved.parameterCorrections!.original).toEqual({ ...historicalParameters(p) });
    for (const table of ['coffees', 'packages', 'methods', 'recipes', 'reflections', 'sessions'] as const) expect(loaded[table]).toEqual(before[table]);
    expect(loaded.preparations.filter(item => item.id !== p.id)).toEqual(before.preparations.filter(item => item.id !== p.id));
    // A second correction retains the FIRST values, including absent optional fields.
    await local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value: { ...value, water: 360, temperature: undefined, grinder: undefined } });
    loaded = await local.loadCollection(); expect(loaded.preparations.find(item => item.id === p.id)!.parameterCorrections!.original).toEqual(saved.parameterCorrections!.original);
    // An independent evaluation uses the latest persisted parameters.
    await local.mutateCollection({ type: 'evaluatePreparation', id: p.id, value: { overall: 0, tags: [], createdAt: p.createdAt, updatedAt: p.updatedAt } });
    const evaluated = (await local.loadCollection()).preparations.find(item => item.id === p.id)!;
    expect(evaluated.snapshot.recipe.water).toBe(360); expect(evaluated.snapshot.recipe.temperature).toBeUndefined(); expect(evaluated.evaluation!.overall).toBe(0); expect(evaluated.evaluation!.acidity).toBeUndefined();
  }));
  it('recusa valores inválidos sem gravações parciais e não ressuscita registros excluídos', async () => withStorage(engine, async local => {
    const { ids, before } = await seed(local); const p = before.preparations.find(p => p.id === ids[0])!;
    for (const invalid of [{ dose: 0 }, { dose: -1 }, { dose: NaN }, { dose: Infinity }, { water: 0 }, { water: -1 }, { water: NaN }, { water: Infinity }, { temperature: 0 }, { temperature: -1 }, { temperature: 101 }, { temperature: NaN }, { temperature: Infinity }, { coffeeId: 'ausente' }]) {
      await expect(local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value: { ...input(p), ...invalid } })).rejects.toThrow();
      expect(await local.loadCollection()).toEqual(before);
    }
    await local.mutateCollection({ type: 'deletePreparation', id: p.id });
    await expect(local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value: input(p) })).rejects.toThrow('disponível');
    await expect(local.mutateCollection({ type: 'evaluatePreparation', id: p.id, value: p.evaluation! })).rejects.toThrow('disponível');
    await expect(local.mutateCollection({ type: 'finishPreparation', value: p })).rejects.toThrow('sessão');
    expect((await local.loadCollection()).preparations.some(item => item.id === p.id)).toBe(false);
  }));
  it('exclui idempotentemente, desvincula apenas reflexões do preparo e preserva consumo após recarga', async () => withStorage(engine, async local => {
    const { ids, before, reflection } = await seed(local); const unrelated = { ...reflection, ...newEntity(), association: { kind: 'preparation' as const, id: ids[1] } };
    await local.mutateCollection({ type: 'reflection', value: { ...unrelated, featured: false } });
    await Promise.all([local.mutateCollection({ type: 'deletePreparation', id: ids[0] }), local.mutateCollection({ type: 'deletePreparation', id: ids[0] })]);
    await local.close(); await validateStorage(local); const loaded = await local.loadCollection();
    expect(loaded.preparations).toHaveLength(2); expect(loaded.preparations).toEqual(before.preparations.filter(p => p.id !== ids[0]));
    const retained = loaded.reflections.find(r => r.id === reflection.id)!;
    expect(retained).toMatchObject({ text: reflection.text, title: reflection.title, category: reflection.category, featured: true, occurredOn: reflection.occurredOn, createdAt: reflection.createdAt }); expect(retained.association).toBeUndefined();
    expect(loaded.reflections.find(r => r.id === unrelated.id)!.association).toEqual(unrelated.association);
    for (const table of ['coffees', 'packages', 'recipes', 'methods', 'sessions'] as const) expect(loaded[table]).toEqual(before[table]);
    expect(loaded.packages[0].remainingWeight).toBe(210); expect(loaded.packages[0].adjustments).toHaveLength(2);
    expect(loaded.packages[0].adjustments.some(event => event.id === ids[0])).toBe(true);
  }));
  it('recalcula Jornada, filtros, perfil, amostras, frequências e hipóteses sem alterar a metodologia', async () => withStorage(engine, async local => {
    const { a, b, ids, before, reflection } = await seed(local); const first = before.preparations.find(p => p.id === ids[0])!;
    const groupA = coffeeExperiences(before).find(g => g.id === a.id)!;
    expect(configurationHypothesis(groupA.preparations)?.best.id).toBe(first.id);
    await local.mutateCollection({ type: 'correctPreparationParameters', id: first.id, value: { ...input(first), coffeeId: b.id, dose: 15, water: 300, grind: '32/60' } });
    let loaded = await local.loadCollection();
    expect(historyRows(loaded.preparations, { ...emptyHistoryFilters, coffeeId: a.id }, 'recent').map(p => p.id)).toEqual([ids[1]]);
    expect(historyRows(loaded.preparations, { ...emptyHistoryFilters, coffeeId: b.id }, 'recent').map(p => p.id)).toContain(first.id);
    expect(associatedReflectionCoffee(loaded, loaded.reflections.find(r => r.id === reflection.id)!)).toBe(b.id);
    const groupB = coffeeExperiences(loaded).find(g => g.id === b.id)!;
    expect(configurationHypothesis(groupB.preparations)?.parameters).toContain('1:20'); expect(configurationHypothesis(groupB.preparations)?.parameters).toContain('32/60');
    expect(coffeeObservations(groupB.preparations).some(o => o.id.startsWith('ratios:'))).toBe(true);
    await local.mutateCollection({ type: 'deletePreparation', id: first.id }); loaded = await local.loadCollection();
    expect(journeySummary(loaded).completed).toHaveLength(2);
    expect(journeyTimeline(loaded).some(item => item.kind === 'preparation' && item.preparation.id === first.id)).toBe(false);
    expect(journeyTimeline(loaded).some(item => item.kind === 'reflection' && item.reflection.id === reflection.id)).toBe(true);
    expect(evaluationSeries(loaded, 'all').ratings.map(p => p.id)).not.toContain(first.id);
    expect(sensoryProfile(loaded.preparations).find(row => row.key === 'acidity')).toMatchObject({ value: undefined, count: 0 });
    expect(recurringSensations(loaded.preparations)[0].preparationIds).toHaveLength(2);
    expect(configurationHypothesis(coffeeExperiences(loaded).find(g => g.id === b.id)!.preparations)).toBeUndefined();
    expect(() => comparisonPreparations(loaded, b.id, [ids[0], ids[2]])).toThrow();
    expect(loaded.preparations.every(p => p.evaluation!.overall === 0)).toBe(true);
  }));
  it('corrige um histórico sem interromper outra sessão ativa e mantém o café histórico se removido da biblioteca', async () => withStorage(engine, async local => {
    const { a, b, ids, before } = await seed(local); const p = before.preparations.find(p => p.id === ids[0])!;
    const active = makeSession(before, before.recipes[0], b.id);
    await local.mutateCollection({ type: 'startSession', value: active });
    await local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value: { ...input(p), grind: '4.2 rotações' } });
    expect((await local.loadCollection()).sessions).toEqual([active]);
    await local.mutateCollection({ type: 'discardSession', id: active.id });
    await local.mutateCollection({ type: 'recipe', value: { ...before.recipes[0], coffeeId: undefined } });
    await local.mutateCollection({ type: 'deleteCoffee', id: a.id });
    await local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value: { ...input(p), water: 310 } });
    expect((await local.loadCollection()).preparations.find(item => item.id === p.id)!.snapshot.coffee).toEqual(p.snapshot.coffee);
  }));
});

it('recusa alterações e exclusão em registros que colidem com uma sessão ativa', () => {
  const data = emptyCollection();
  const e = newEntity(); const recipe = { ...e, familyId: e.id, name: 'R', methodId: 'm', version: 1, dose: 20, water: 300, steps: [{ id: 'a', order: 0, name: 'A', type: 'pour' as const, water: 300, cumulativeWater: 300, advance: 'manual' as const }] };
  data.methods.push({ ...newEntity(), id: 'm', name: 'M' }); data.recipes.push(recipe);
  const session = makeSession(data, recipe); data.sessions.push(session);
  const p = new BrewClock(session, 0).preparation('completed', '', false, 0, Date.parse(session.startedAt)); data.preparations.push(p);
  expect(() => applyMutation(data, { type: 'deletePreparation', id: p.id })).toThrow('sessão');
  expect(() => applyMutation(data, { type: 'correctPreparationParameters', id: p.id, value: input(p) })).toThrow('sessão');
});

it('preserva fotografias referenciadas por snapshots, correções e sessões', () => {
  const data = emptyCollection(); const e = newEntity();
  const p = { ...e, snapshot: { coffee: { ...e, photoId: 'current' } }, parameterCorrections: { original: { coffee: { ...e, photoId: 'original' } } } } as Preparation;
  data.preparations.push(p);
  expect(photoIsReferenced(data, 'current')).toBe(true); expect(photoIsReferenced(data, 'original')).toBe(true); expect(photoIsReferenced(data, 'unused')).toBe(false);
});

it('invalida associações de perfil ao cair abaixo de três amostras por grupo, mantendo zeros e ausências', () => {
  const data = emptyCollection();
  for (let i = 0; i < 6; i++) data.preparations.push({ ...newEntity(), state: 'completed', evaluation: { overall: i < 3 ? 9 : 0, acidity: i < 3 ? 8 : 0, tags: [] } } as unknown as Preparation);
  expect(profileAssociations(data.preparations)).toHaveLength(1);
  const next = applyMutation(data, { type: 'deletePreparation', id: data.preparations[0].id });
  expect(profileAssociations(next.preparations)).toEqual([]); expect(sensoryProfile(next.preparations).find(r => r.key === 'acidity')!.count).toBe(5);
});

it('reverte toda a exclusão SQLite se a desvinculação de uma reflexão falhar', async () => withStorage('sqlite', async (local, sql) => {
  const { ids, before } = await seed(local);
  sql!.exec("CREATE TRIGGER prevent_reflection_update BEFORE UPDATE ON reflections BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;");
  await expect(local.mutateCollection({ type: 'deletePreparation', id: ids[0] })).rejects.toThrow('falha simulada');
  expect(await local.loadCollection()).toEqual(before);
}));

it('reverte toda a exclusão IndexedDB se a gravação da reflexão falhar', async () => withStorage('indexeddb', async local => {
  const { ids, before } = await seed(local);
  const originalPut = IDBObjectStore.prototype.put;
  const write = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
    if (this.name === 'reflections') throw new DOMException('falha simulada', 'DataError');
    return originalPut.apply(this, args);
  });
  try { await expect(local.mutateCollection({ type: 'deletePreparation', id: ids[0] })).rejects.toThrow('falha simulada'); }
  finally { write.mockRestore(); }
  expect(await local.loadCollection()).toEqual(before);
}));

it('guarda somente campos corrigidos e mantém ausências, sem aceitar reescrita estrutural', async () => withStorage('indexeddb', async local => {
  const { ids, before } = await seed(local); const p = before.preparations.find(p => p.id === ids[0])!;
  // Runtime extras cannot bypass the mutation's whitelist.
  const value = { ...input(p), grind: '  4.2 rotações  ', snapshot: { recipe: {} }, evaluation: undefined, consumedGrams: 100, elapsedMs: 1 };
  await local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value });
  const saved = (await local.loadCollection()).preparations.find(p => p.id === ids[0])!;
  expect(saved.parameterCorrections!.original).toEqual({ grind: '27/40' });
  expect(saved.snapshot.recipe.grind).toBe('4.2 rotações'); expect(saved.evaluation).toEqual(p.evaluation); expect(saved.consumedGrams).toBe(p.consumedGrams); expect(saved.elapsedMs).toBe(p.elapsedMs);
  const after = await local.loadCollection();
  await local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value: input(saved) });
  expect(await local.loadCollection()).toEqual(after);
  await local.mutateCollection({ type: 'correctPreparationParameters', id: p.id, value: { ...input(saved), coffeeId: undefined, temperature: undefined } });
  const detached = (await local.loadCollection()).preparations.find(p => p.id === ids[0])!;
  expect(detached.snapshot.coffee).toBeUndefined(); expect(detached.snapshot.recipe.temperature).toBeUndefined();
  expect(detached.parameterCorrections!.original).toMatchObject({ coffee: p.snapshot.coffee, temperature: 92 });
}));

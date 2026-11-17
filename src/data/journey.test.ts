import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { applyMutation, collectionTables, emptyCollection, newEntity } from '../domain/collection';
import { evaluationSeries, journeyNarrative, journeySummary, journeyTags, journeyTimeline, localDay, monthlyEvaluations, type Reflection } from '../domain/journey';
import type { Preparation } from '../domain/preparation';
import { IndexedDBStorage } from './indexeddb-storage';
import { validateStorage } from '../domain/local-storage';
import { sqliteVersion2, sqliteVersion3, sqliteVersion4, sqliteVersion5 } from './sqlite-schema';

function preparation(id: string, at: string, method = 'm1', coffee = 'c1'): Preparation {
  const e = newEntity();
  return { ...e, id, startedAt: at, finishedAt: at, state: 'completed', elapsedMs: 0, consumedGrams: 0, executions: [], snapshot: {
    method: { ...e, id: method, name: method }, coffee: { ...e, id: coffee, name: coffee, tried: false, favorite: false, ratings: { overall: 10 }, sensoryTagIds: ['commercial'] },
    technique: { ...e, id: 't1', name: 'Técnica', sources: [] }, recipe: { ...e, familyId: e.id, name: 'Receita', methodId: method, version: 1, dose: 20, water: 300, steps: [] },
  } };
}
function reflection(extra: Partial<Reflection> = {}): Reflection { return { ...newEntity(), occurredOn: '2026-11-16', text: '  Minhas palavras.\nSem alterações.  ', ...extra }; }
const evaluation = { overall: 0, acidity: 0, body: 5, tags: ['Floral', 'Floral'], createdAt: '2026-11-16T12:00:00Z', updatedAt: '2026-11-16T12:00:00Z' };

describe('Jornada derivada dos registros', () => {
  it('agrega médias mensais com contagem, preserva nota zero e deixa meses ausentes fora da série', () => {
    const points = [
      { id: '1', at: '2026-09-04T12:00:00Z', value: 0 },
      { id: '2', at: '2026-09-15T12:00:00Z', value: 8 },
      { id: '3', at: '2026-11-01T12:00:00Z', value: 9 },
    ];
    expect(monthlyEvaluations(points)).toEqual([
      { month: '2026-09', value: 4, count: 2 },
      { month: '2026-11', value: 9, count: 1 },
    ]);
    expect(monthlyEvaluations([])).toEqual([]);
    expect(monthlyEvaluations([...points].reverse())).toEqual(monthlyEvaluations(points));
  });

  it('conta somente concluídos, deduplica identidades e calcula percentuais sobre métodos identificáveis', () => {
    const d = emptyCollection();
    const missing = preparation('d', '2026-11-13T12:00:00Z');
    // Historical payloads may lack the method despite the current type requiring one.
    Object.assign(missing.snapshot, { method: undefined, coffee: undefined, technique: undefined });
    d.preparations = [preparation('a', '2026-11-10T12:00:00Z'), preparation('b', '2026-11-11T12:00:00Z'), preparation('c', '2026-11-12T12:00:00Z', 'm2', 'c2'), missing, { ...preparation('x', '2026-11-09T12:00:00Z', 'm3', 'c3'), state: 'interrupted' }];
    const s = journeySummary(d);
    expect(s.completed).toHaveLength(4); expect(s.coffees).toBe(2); expect(s.techniques).toBe(1); expect(s.methods).toHaveLength(2);
    expect(s.methods[0].percent).toBeCloseTo(200 / 3); expect(s.withoutMethod).toBe(1); expect(s.identified).toBe(3);
    expect(journeyNarrative(d)).toContain('10 de novembro de 2026'); expect(journeyNarrative(d)).not.toContain('preferido');
  });
  it('exclui notas ausentes, preserva zero e separa características e tags do cadastro comercial', () => {
    let d = emptyCollection(); d.preparations = [preparation('a', '2026-11-10T12:00:00Z'), preparation('b', '2026-11-11T12:00:00Z'), preparation('c', '2026-10-01T12:00:00Z')];
    d = applyMutation(d, { type: 'evaluatePreparation', id: 'a', value: evaluation });
    d = applyMutation(d, { type: 'evaluatePreparation', id: 'c', value: { ...evaluation, overall: undefined, tags: ['floral'] } });
    const s = evaluationSeries(d, 'month', new Date('2026-11-16T12:00:00Z'));
    expect(s.ratings.map(p => p.value)).toEqual([0]); expect(s.characteristics.map(p => p.value)).toEqual([2]); expect(s.evaluated).toBe(1);
    expect(evaluationSeries(d, 'all').evaluated).toBe(2); expect(journeyTags(d)).toEqual([{ name: 'floral', preparationIds: ['c', 'a'] }]);
    expect(evaluationSeries(d, 'year', new Date('2027-01-01T12:00:00Z')).ratings).toEqual([]);
  });
  it('agrupa avaliação e marcos no preparo, ordena datas reais e mantém identificadores estáveis', () => {
    const d = emptyCollection(); const a = { ...preparation('a', '2026-11-10T12:00:00Z'), evaluation };
    d.preparations = [preparation('b', '2026-11-11T12:00:00Z'), a]; d.reflections = [reflection({ id: 'r', occurredOn: '2026-11-09' })];
    const items = journeyTimeline(d);
    expect(items.map(i => i.id)).toEqual(['preparation:b', 'preparation:a', 'reflection:r']);
    expect(items[1].kind === 'preparation' && items[1].milestones).toHaveLength(3);
    expect(items[0].kind === 'preparation' && items[0].milestones).toHaveLength(0);
    expect(journeyTimeline({ ...d, preparations: [...d.preparations].reverse() })).toEqual(items);
  });
  it('oferece estados vazios sem dados fictícios e respeita a data local do diário', () => {
    const d = emptyCollection(); expect(journeyTimeline(d)).toEqual([]); expect(journeySummary(d).methods).toEqual([]); expect(journeyTags(d)).toEqual([]); expect(journeyNarrative(d)).toContain('pode começar');
    const date = new Date(2026, 10, 16, 23, 59); expect(localDay(date)).toBe('2026-11-16');
  });
  it('valida reflexão e associação opcional, preserva autoria e permite editar vínculos órfãos', () => {
    let d = emptyCollection(); const r = reflection();
    expect(() => applyMutation(d, { type: 'reflection', value: { ...r, text: '  ' } })).toThrow();
    expect(() => applyMutation(d, { type: 'reflection', value: { ...r, occurredOn: '2026-02-30' } })).toThrow();
    expect(() => applyMutation(d, { type: 'reflection', value: { ...r, association: { kind: 'coffee', id: 'missing' } } })).toThrow();
    d = applyMutation(d, { type: 'reflection', value: r }); expect(d.reflections[0].text).toBe(r.text);
    d.coffees = [{ ...newEntity(), id: 'c', name: 'Café', tried: false, favorite: false }];
    d = applyMutation(d, { type: 'reflection', value: { ...r, association: { kind: 'coffee', id: 'c' }, featured: true } });
    d = applyMutation(d, { type: 'deleteCoffee', id: 'c' }); expect(d.reflections[0].text).toBe(r.text);
    d = applyMutation(d, { type: 'reflection', value: { ...d.reflections[0], createdAt: '2020-01-01T00:00:00Z', title: 'Novo título' } });
    expect(d.reflections[0].createdAt).toBe(r.createdAt);
    d = applyMutation(d, { type: 'reflection', value: reflection({ featured: true }) }); expect(d.reflections.filter(r => r.featured)).toHaveLength(1);
    d = applyMutation(d, { type: 'deleteReflection', id: r.id }); expect(d.reflections).toHaveLength(1);
  });
  it('avalia somente concluídos com valores válidos sem modificar snapshot, estoque, sessão ou receita', () => {
    const d = emptyCollection(); d.preparations = [preparation('a', '2026-11-10T12:00:00Z'), { ...preparation('b', '2026-11-11T12:00:00Z'), state: 'interrupted' }];
    expect(() => applyMutation(d, { type: 'evaluatePreparation', id: 'b', value: evaluation })).toThrow();
    expect(() => applyMutation(d, { type: 'evaluatePreparation', id: 'a', value: { ...evaluation, overall: 11 } })).toThrow();
    const next = applyMutation(d, { type: 'evaluatePreparation', id: 'a', value: evaluation });
    expect(next.preparations[0].snapshot).toBe(d.preparations[0].snapshot); expect(next.packages).toBe(d.packages); expect(next.sessions).toBe(d.sessions); expect(next.recipes).toBe(d.recipes);
  });
});
describe('persistência e migração da Jornada', () => {
  it('migra IndexedDB 4 → 5 preservando todas as tabelas, metadados e fotos, e persiste CRUD após reabrir', async () => {
    const name = `journey-${crypto.randomUUID()}`;
    const d = emptyCollection(); d.preparations = [preparation('p', '2026-11-10T12:00:00Z')];
    const p = d.preparations[0];
    d.coffees = [p.snapshot.coffee!]; d.methods = [p.snapshot.method]; d.techniques = [p.snapshot.technique!]; d.recipes = [p.snapshot.recipe];
    d.packages = [{ ...newEntity(), coffeeId: p.snapshot.coffee!.id, initialWeight: 250, remainingWeight: 230, adjustments: [] }];
    d.records = [{ ...newEntity(), kind: 'producer', name: 'Produtor preservado' }];
    d.sessions = [{ ...newEntity(), snapshot: p.snapshot, startedAt: p.startedAt, checkpointAt: p.finishedAt, elapsedMs: 0, status: 'paused', stepIndex: 0, stepStartedMs: 0, executions: [], needsConfirmation: false }];
    // Every old table gets a sentinel payload, without reinterpreting old data.
    const previous = collectionTables.filter(t => t !== 'reflections');
    await new Promise<void>((resolve, reject) => { const request = indexedDB.open(name, 4);
      request.onupgradeneeded = () => {
        const db = request.result; const meta = db.createObjectStore('metadata'); meta.put('4', 'schema-version'); meta.put('preservar', 'preference');
        for (const table of previous) { const store = db.createObjectStore(table, { keyPath: 'id' }); for (const value of d[table]) store.put(value); }
        db.createObjectStore('photos', { keyPath: 'id' }).put({ id: 'photo', blob: new Blob(['foto']) });
      }; request.onerror = () => reject(request.error); request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const db = new IndexedDBStorage(name);
    try {
      await validateStorage(db); const loaded = await db.loadCollection();
      for (const table of previous) expect(loaded[table]).toEqual(d[table]);
      expect(await db.getMetadata('preference')).toBe('preservar'); const photo = await db.photoUrl('photo'); expect(photo).toMatch(/^blob:/); URL.revokeObjectURL(photo!);
      const r = reflection({ association: { kind: 'preparation', id: 'p' } });
      await db.mutateCollection({ type: 'reflection', value: r });
      await db.mutateCollection({ type: 'evaluatePreparation', id: 'p', value: evaluation });
      await db.close(); await validateStorage(db);
      expect((await db.loadCollection()).reflections[0].text).toBe(r.text);
      await db.mutateCollection({ type: 'reflection', value: { ...r, title: 'Editado' } });
      await expect(db.mutateCollection({ type: 'reflection', value: { ...r, text: '' } })).rejects.toThrow();
      expect((await db.loadCollection()).reflections[0].title).toBe('Editado');
      await db.mutateCollection({ type: 'deleteReflection', id: r.id }); expect((await db.loadCollection()).reflections).toEqual([]);
      expect((await db.loadCollection()).preparations[0].evaluation?.overall).toBe(0);
    } finally { await db.close(); indexedDB.deleteDatabase(name); }
  });
  it('migra SQLite 4 → 5 de forma incremental e idempotente sem alterar dados anteriores', () => {
    const db = new DatabaseSync(':memory:');
    try {
      [...sqliteVersion2, ...sqliteVersion3, ...sqliteVersion4].forEach(sql => db.exec(sql));
      const tables = collectionTables.filter(t => t !== 'reflections');
      for (const t of ['preparations', 'sessions', 'methods', 'records']) {
        if (t === 'records') db.prepare('INSERT INTO records(id,kind,payload) VALUES (?,?,?)').run(t, 'producer', '{"old":true}');
        else db.prepare(`INSERT INTO ${t}(id,payload) VALUES (?,?)`).run(t, '{"old":true}');
      }
      const before = tables.map(t => db.prepare(`SELECT * FROM ${t}`).all());
      sqliteVersion5.forEach(sql => db.exec(sql)); sqliteVersion5.forEach(sql => db.exec(sql));
      expect(db.prepare("SELECT value FROM metadata WHERE key='schema-version'").get()?.value).toBe('5');
      expect(tables.map(t => db.prepare(`SELECT * FROM ${t}`).all())).toEqual(before);
      const r = reflection(); db.prepare('INSERT INTO reflections(id,payload) VALUES (?,?)').run(r.id, JSON.stringify(r));
      expect(JSON.parse(String(db.prepare('SELECT payload FROM reflections').get()?.payload))).toEqual(r);
    } finally { db.close(); }
  });
});

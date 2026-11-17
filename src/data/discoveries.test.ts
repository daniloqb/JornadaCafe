import { describe, expect, it } from 'vitest';
import { emptyCollection, newEntity } from '../domain/collection';
import type { Preparation } from '../domain/preparation';
import type { Reflection } from '../domain/journey';
import { associatedReflectionCoffee, coffeeExperiences, coffeeObservations, comparisonPreparations, completedExperiences, configurationHypothesis, highestRated, isScore, knowledgeReflections, profileAssociations, recurringSensations, sensoryProfile } from '../domain/discoveries';

function preparation(id: string, coffeeId = 'c', changes: Partial<Preparation> = {}): Preparation {
  const e = newEntity();
  return { ...e, id, state: 'completed', startedAt: '2026-11-10T12:00:00Z', finishedAt: '2026-11-10T12:04:00Z', elapsedMs: 240000, consumedGrams: 0, executions: [], snapshot: {
    coffee: { ...e, id: coffeeId, name: `Café ${coffeeId}`, tried: false, favorite: false, ratings: { overall: 10, acidity: 10 }, sensoryTagIds: ['comercial'] },
    method: { ...e, id: 'method', name: 'Método histórico' }, technique: { ...e, id: 'technique', name: 'Técnica histórica', sources: [] },
    recipe: { ...e, id: 'recipe', familyId: 'recipe', name: 'Receita histórica', methodId: 'method', version: 2, dose: 20, water: 300, grind: '27/40', grinder: 'Moedor A, escala de 40 cliques', temperature: 92, steps: [] },
  }, ...changes };
}
const evaluation = (overall?: number, acidity?: number) => ({ overall, acidity, tags: [] as string[], createdAt: '2026-11-10T12:00:00Z', updatedAt: '2026-11-10T12:00:00Z' });
const reflection = (id: string, changes: Partial<Reflection> = {}): Reflection => ({ ...newEntity(), id, occurredOn: '2026-11-10', text: 'Minhas próprias palavras.', ...changes });

describe('Minhas Descobertas: cálculos e rastreabilidade', () => {
  it('calcula médias por campo, distingue zero, null e ausência e exclui interrompidos e dados comerciais', () => {
    const first = preparation('a', 'c', { evaluation: { ...evaluation(undefined, 0), sweetness: 8 } });
    const second = preparation('b', 'c', { evaluation: evaluation(undefined, 6) });
    Object.assign(second.evaluation!, { body: null, intensity: NaN });
    const records = [first, second, preparation('sem'), preparation('interrompido', 'c', { state: 'interrupted', evaluation: { ...evaluation(10, 10), body: 10 } })];
    const rows = sensoryProfile(records);
    expect(rows.find(r => r.key === 'acidity')).toMatchObject({ value: 3, count: 2, preparationIds: ['a', 'b'] });
    expect(rows.find(r => r.key === 'sweetness')).toMatchObject({ value: 8, count: 1 });
    expect(rows.find(r => r.key === 'body')).toMatchObject({ value: undefined, count: 0 });
    expect(rows.find(r => r.key === 'intensity')).toMatchObject({ value: undefined, count: 0 });
    expect([null, undefined, NaN, Infinity, -1, 11, '8'].some(isScore)).toBe(false); expect(isScore(0)).toBe(true);
  });
  it('deduplica tags por avaliação, com caixa/acentos/espaços, sem inferir preferência ou notas comerciais', () => {
    const a = preparation('a', 'c', { evaluation: { ...evaluation(), tags: [' Cítrico ', 'citrico', 'CÍTRICO', 'Chocolate'] } });
    const b = preparation('b', 'c', { evaluation: { ...evaluation(), tags: ['cítrico'] } });
    expect(recurringSensations([a, b, preparation('sem')])).toEqual([{ name: 'Cítrico', preparationIds: ['a', 'b'] }, { name: 'Chocolate', preparationIds: ['a'] }]);
  });
  it('agrupa cafés por identidade histórica, incluindo cafés removidos e sem confundir nomes iguais', () => {
    const d = emptyCollection(); d.preparations = [preparation('a'), preparation('b'), preparation('c', 'other'), preparation('x', 'c', { state: 'interrupted' })];
    d.coffees = [{ ...newEntity(), id: 'c', name: 'Nome atual', tried: true, favorite: false }];
    const groups = coffeeExperiences(d);
    expect(groups.find(g => g.id === 'c')).toMatchObject({ name: 'Nome atual', exists: true, preparations: [d.preparations[0], d.preparations[1]] });
    expect(groups.find(g => g.id === 'other')).toMatchObject({ exists: false, name: 'Café other' });
    expect(completedExperiences(d)).toHaveLength(3);
  });
  it('aceita dois/três preparos com ou sem nota e recusa seleções duplicadas, misturadas ou interrompidas', () => {
    const d = emptyCollection(); d.preparations = [preparation('a'), preparation('b'), preparation('c'), preparation('outro', 'other'), preparation('x', 'c', { state: 'interrupted' })];
    expect(comparisonPreparations(d, 'c', ['b', 'a'])).toEqual([d.preparations[1], d.preparations[0]]);
    expect(comparisonPreparations(d, 'c', ['a', 'b', 'c'])).toHaveLength(3);
    for (const ids of [['a'], ['a', 'a'], ['a', 'b', 'c', 'x'], ['a', 'outro'], ['a', 'x'], ['a', 'missing']]) expect(() => comparisonPreparations(d, 'c', ids)).toThrow();
  });
  it('usa o snapshot original sem substituir receita, versão, moagem ou equipamento pelos valores atuais', () => {
    const d = emptyCollection(); d.preparations = [preparation('a'), preparation('b')];
    d.recipes = [{ ...d.preparations[0].snapshot.recipe, name: 'Receita editada', version: 9, grind: '27/60', grinder: 'Moedor B', temperature: 96 }];
    const selected = comparisonPreparations(d, 'c', ['a', 'b']);
    expect(selected[0]).toBe(d.preparations[0]); expect(selected[0].snapshot.recipe).toMatchObject({ name: 'Receita histórica', version: 2, grind: '27/40', grinder: 'Moedor A, escala de 40 cliques', temperature: 92 });
  });
  it('destaca somente notas válidas e comparáveis, inclusive zero e empates, sem premiar ausências', () => {
    const a = preparation('a', 'c', { evaluation: evaluation(0) });
    const b = preparation('b', 'c', { evaluation: evaluation(0) });
    expect(highestRated([a, b, preparation('sem')])).toEqual(['a', 'b']);
    expect(highestRated([a, preparation('sem')])).toEqual([]);
    expect(highestRated([a, preparation('outro', 'other', { evaluation: evaluation(10) })])).toEqual([]);
    expect(configurationHypothesis([a, b])).toBeUndefined();
  });
  it('sugere hipótese somente com duas avaliações do mesmo café e uma maior nota sem empate, sempre rastreável', () => {
    const a = preparation('a', 'c', { evaluation: evaluation(7) }); const b = preparation('b', 'c', { evaluation: evaluation(9) }); const unrated = preparation('sem');
    expect(configurationHypothesis([a, unrated])).toBeUndefined();
    const h = configurationHypothesis([a, b, unrated])!;
    expect(h.best.id).toBe('b'); expect(h.evaluated).toBe(2); expect(h.considered).toBe(3); expect(h.preparationIds).toEqual(['a', 'b', 'sem']);
    expect(h.parameters).toContain('27/40'); expect(h.parameters).toContain('Moedor A'); expect(h.limitation).toContain('sem conclusão de causa e efeito'); expect(h.text).not.toMatch(/ideal|causou|melhorou|prefere/);
  });
  it('produz observações verificáveis e não conta proporções equivalentes como diferentes', () => {
    const a = preparation('a', 'c', { evaluation: { ...evaluation(7), tags: ['Floral'] } }); const b = preparation('b', 'c', { evaluation: { ...evaluation(9), tags: ['Floral'] }, elapsedMs: 0 });
    b.snapshot.recipe = { ...b.snapshot.recipe, dose: 25, water: 375 };
    expect(coffeeObservations([a, b]).some(o => o.id.startsWith('ratios:'))).toBe(false);
    b.snapshot.recipe = { ...b.snapshot.recipe, water: 400 };
    const observations = coffeeObservations([a, b]);
    expect(observations.some(o => o.id.startsWith('ratios:'))).toBe(true);
    expect(observations.find(o => o.id.startsWith('tag:'))?.preparationIds).toEqual(['a', 'b']);
    expect(observations.find(o => o.id.startsWith('times:'))?.preparationIds).toEqual(['a', 'b']);
    expect(coffeeObservations([preparation('sem')])).toHaveLength(1);
    expect(coffeeObservations([a, preparation('mix', 'other')])).toEqual([]);
  });
  it('exige três avaliações com o campo preenchido em cada grupo descritivo de notas', () => {
    const records = Array.from({ length: 6 }, (_, i) => preparation(String(i), 'c', { evaluation: evaluation(i < 3 ? 8 : 7, i < 3 ? 6 : 4) }));
    const association = profileAssociations(records);
    expect(association).toHaveLength(1); expect(association[0]).toMatchObject({ label: 'Acidez', upper: { count: 3, value: 6 }, other: { count: 3, value: 4 } });
    expect(profileAssociations(records.slice(1))).toEqual([]);
    expect(profileAssociations(records.map(p => ({ ...p, evaluation: { ...p.evaluation!, acidity: 5 } })))).toEqual([]);
    expect(association[0].preparationIds).toHaveLength(6);
  });
  it('reutiliza reflexões por identidade e filtra categoria, café direto/indireto e período sem excluir textos sem vínculo', () => {
    const d = emptyCollection(); d.preparations = [preparation('p')];
    d.reflections = [reflection('livre'), reflection('cafe', { category: 'Aprendizado', association: { kind: 'coffee', id: 'c' }, occurredOn: '2026-11-11' }), reflection('preparo', { category: 'Experimentos', association: { kind: 'preparation', id: 'p' }, occurredOn: '2026-11-12' }), reflection('orfao', { association: { kind: 'preparation', id: 'missing' } })];
    expect(knowledgeReflections(d)).toHaveLength(4);
    expect(knowledgeReflections(d, { coffeeId: 'c' }).map(r => r.id)).toEqual(['preparo', 'cafe']);
    expect(knowledgeReflections(d, { category: 'Aprendizado' })[0]).toBe(d.reflections[1]);
    expect(knowledgeReflections(d, { from: '2026-11-11', to: '2026-11-11' }).map(r => r.id)).toEqual(['cafe']);
    expect(associatedReflectionCoffee(d, d.reflections[3])).toBeUndefined();
    d.reflections[1].text = 'Edição do mesmo registro'; expect(knowledgeReflections(d, { category: 'Aprendizado' })[0].text).toBe('Edição do mesmo registro');
  });
  it('oferece ausência de dados e não modifica registros ao analisar ou comparar', () => {
    const d = emptyCollection(); expect(coffeeExperiences(d)).toEqual([]); expect(knowledgeReflections(d)).toEqual([]); expect(configurationHypothesis([])).toBeUndefined();
    d.preparations = [preparation('a', 'c', { evaluation: evaluation(7, 0) }), preparation('b', 'c', { evaluation: evaluation(9, 6) })];
    const original = structuredClone(d);
    sensoryProfile(d.preparations); recurringSensations(d.preparations); comparisonPreparations(d, 'c', ['a', 'b']); coffeeObservations(d.preparations); configurationHypothesis(d.preparations); profileAssociations(d.preparations); knowledgeReflections(d);
    expect(d).toEqual(original);
  });
});

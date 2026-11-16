import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { applyMutation, emptyCollection, newEntity } from '../domain/collection';
import { referenceCatalog } from '../reference/catalog';
import { IndexedDBStorage } from './indexeddb-storage';
import { validateStorage } from '../domain/local-storage';

const request = { type: 'importReference', kind: 'receitas', key: 'quatro-seis-equilibrado' } as const;
describe('biblioteca de referência', () => {
  it('mantém o catálogo imutável, com classificações, pesos e tempos confirmados', () => {
    expect(referenceCatalog.methods).toHaveLength(8);
    expect(referenceCatalog.techniques).toHaveLength(5);
    expect(referenceCatalog.recipes).toHaveLength(4);
    const result = referenceCatalog.recipes.reduce((data, r) => applyMutation(data, { ...request, key: r.referenceKey }), emptyCollection());
    expect(result.methods).toHaveLength(1); expect(result.techniques).toHaveLength(2);
    expect(result.recipes.map(r => r.steps.filter(s => s.type === 'pour').map(s => s.cumulativeWater))).toEqual([[60, 120, 180, 240, 300], [50, 120, 180, 240, 300], [125, 250, 375], [75, 250, 375]]);
    for (const r of result.recipes) expect(r.steps.every(s => s.startSeconds === undefined && s.advance !== 'time')).toBe(true);
    const special = result.recipes[3];
    expect(special.steps[0]).toMatchObject({ durationSeconds: 40, advance: 'manual' });
    expect(special.steps[2]).toMatchObject({ type: 'wait', advance: 'observable', water: 0 });
    expect(special.steps[3].water).toBe(125);
    expect(special.source?.url).toBeUndefined();
    expect(() => { referenceCatalog.recipes[0].steps[0].water = 999; }).toThrow();
    expect(emptyCollection().recipes).toEqual([]);
  });
  it('importa dependências uma vez e preserva edições e versões pessoais, sem mesclar nomes', () => {
    const personalMethod = { ...newEntity(), name: 'V60' };
    const before = applyMutation(emptyCollection(), { type: 'method', value: personalMethod });
    let data = applyMutation(before, request);
    expect(data.methods).toHaveLength(2); expect(data.techniques).toHaveLength(1); expect(data.recipes).toHaveLength(1);
    const copy = data.recipes[0];
    data = applyMutation(data, { type: 'recipe', value: { ...copy, name: 'Minha adaptação', notes: 'Preservar' } });
    const version = { ...copy, ...newEntity(), name: 'Minha segunda versão' };
    data = applyMutation(data, { type: 'recipe', value: version, fromId: copy.id });
    expect(applyMutation(data, request)).toBe(data);
    expect(data.recipes[1].referenceKey).toBe(copy.referenceKey);
    expect(data.recipes[0].name).toBe('Minha adaptação');
    expect(referenceCatalog.recipes[0].name).toBe('V60 4:6 equilibrado');
    expect(before.methods).toHaveLength(1); expect(before.methods[0]).toMatchObject({ id: personalMethod.id, name: personalMethod.name }); expect(before.recipes).toEqual([]);
    const withTechnique = applyMutation(emptyCollection(), { type: 'importReference', kind: 'tecnicas', key: 'quatro-seis' });
    const otherMethod = { ...newEntity(), name: 'Outro método' };
    const changed = applyMutation(applyMutation(withTechnique, { type: 'method', value: otherMethod }), { type: 'technique', value: { ...withTechnique.techniques[0], methodId: otherMethod.id } });
    expect(() => applyMutation(changed, request)).toThrow('Suas edições foram preservadas');
    expect(changed.recipes).toEqual([]);
  });
  it('persiste importações concorrentes e edições no esquema 4 sem alterar coleção, estoque ou histórico', async () => {
    const storage = new IndexedDBStorage(`reference-${crypto.randomUUID()}`);
    try {
      await validateStorage(storage);
      const coffee = { ...newEntity(), name: 'Meu café', tried: false, favorite: false };
      const packet = { ...newEntity(), coffeeId: coffee.id, initialWeight: 250, remainingWeight: 100, adjustments: [] };
      await storage.mutateCollection({ type: 'coffee', value: coffee });
      await storage.mutateCollection({ type: 'package', value: packet });
      await storage.setMetadata('preservar', 'anterior');
      const before = await storage.loadCollection();
      await Promise.all([storage.mutateCollection(request), storage.mutateCollection(request)]);
      const data = await storage.loadCollection();
      expect(data.methods).toHaveLength(1); expect(data.techniques).toHaveLength(1); expect(data.recipes).toHaveLength(1);
      await storage.mutateCollection({ type: 'recipe', value: { ...data.recipes[0], name: 'Edição local' } });
      await storage.close(); await storage.initialize(); await storage.mutateCollection(request);
      const reopened = await storage.loadCollection();
      expect(reopened.recipes[0].name).toBe('Edição local');
      for (const table of ['coffees', 'packages', 'records', 'preparations', 'sessions'] as const) expect(reopened[table]).toEqual(before[table]);
      expect(await storage.getMetadata('schema-version')).toBe('4');
      expect(await storage.getMetadata('preservar')).toBe('anterior');
      await expect(storage.mutateCollection({ ...request, key: 'inexistente' })).rejects.toThrow('não está disponível');
    } finally { await storage.close(); }
  });
  it('salva o catálogo completo de forma atômica e preserva edições e exclusões ao reabrir', async () => {
    const storage = new IndexedDBStorage(`catalog-${crypto.randomUUID()}`);
    const bulk = { type: 'importReferenceCatalog' } as const;
    try {
      await validateStorage(storage);
      const coffee = { ...newEntity(), name: 'Café pessoal', tried: false, favorite: true };
      const packet = { ...newEntity(), coffeeId: coffee.id, initialWeight: 250, remainingWeight: 120, adjustments: [] };
      await storage.mutateCollection({ type: 'coffee', value: coffee });
      await storage.mutateCollection({ type: 'package', value: packet });
      const before = await storage.loadCollection();
      await Promise.all([storage.mutateCollection(bulk), storage.mutateCollection(bulk)]);
      let data = await storage.loadCollection();
      expect([data.methods.length, data.techniques.length, data.recipes.length]).toEqual([8, 5, 4]);
      const method = data.methods.find(v => v.referenceKey === 'v60')!;
      const technique = data.techniques.find(v => v.referenceKey === 'quatro-seis')!;
      const recipe = data.recipes.find(v => v.referenceKey === 'quatro-seis-equilibrado')!;
      await storage.mutateCollection({ type: 'method', value: { ...method, name: 'Meu V60' } });
      await storage.mutateCollection({ type: 'technique', value: { ...technique, name: 'Minha técnica' } });
      await storage.mutateCollection({ type: 'recipe', value: { ...recipe, name: 'Minha receita' } });
      await storage.close(); await storage.initialize(); await storage.mutateCollection(bulk);
      data = await storage.loadCollection();
      expect(data.methods.find(v => v.id === method.id)?.name).toBe('Meu V60');
      expect(data.techniques.find(v => v.id === technique.id)?.name).toBe('Minha técnica');
      expect(data.recipes.find(v => v.id === recipe.id)?.name).toBe('Minha receita');
      for (const table of ['coffees', 'packages', 'records', 'preparations', 'sessions'] as const) expect(data[table]).toEqual(before[table]);
      const moka = data.methods.find(v => v.referenceKey === 'moka')!;
      await storage.mutateCollection({ type: 'deleteMethod', id: moka.id });
      await storage.close(); await storage.initialize();
      expect((await storage.loadCollection()).methods.some(v => v.id === moka.id)).toBe(false);
      await storage.mutateCollection(bulk);
      expect((await storage.loadCollection()).methods).toHaveLength(8);
      // A late validation failure must also undo the methods inserted earlier in the batch.
      for (const value of data.recipes.filter(v => v.techniqueId === technique.id)) await storage.mutateCollection({ type: 'deleteRecipe', id: value.id });
      const melitta = data.methods.find(v => v.referenceKey === 'melitta')!;
      await storage.mutateCollection({ type: 'deleteMethod', id: melitta.id });
      await storage.mutateCollection({ type: 'technique', value: { ...technique, methodId: moka.id } });
      const beforeFailure = await storage.loadCollection();
      await expect(storage.mutateCollection(bulk)).rejects.toThrow('Suas edições foram preservadas');
      expect(await storage.loadCollection()).toEqual(beforeFailure);
      expect(await storage.getMetadata('schema-version')).toBe('4');
    } finally { await storage.close(); }
  });

});

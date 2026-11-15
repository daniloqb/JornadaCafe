import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { IndexedDBStorage } from './indexeddb-storage';
import { sqliteVersion2, sqliteVersion3 } from './sqlite-schema';
import { applyMutation, emptyCollection, newEntity, type CollectionData } from '../domain/collection';
import { changeStepWater, ratio, recalculateSteps, type BrewRecipe, type RecipeStep } from '../domain/brewing';
import { validateStorage } from '../domain/local-storage';

function fixture() {
  const method = { ...newEntity(), name: 'V60' };
  const technique = { ...newEntity(), name: '4:6', methodId: method.id, creator: 'Tetsu Kasuya', sources: [{ id: crypto.randomUUID(), author: 'Canal de estudo', url: 'https://www.youtube.com/watch?v=example' }] };
  const data = applyMutation(applyMutation(emptyCollection(), { type: 'method', value: method }), { type: 'technique', value: technique });
  const entity = newEntity();
  const steps = (weights: number[]) => recalculateSteps(weights.map((water, order): RecipeStep => ({ id: crypto.randomUUID(), order, name: `Despejo ${order + 1}`, type: 'pour', water, cumulativeWater: 0, advance: 'manual' })));
  const recipe: BrewRecipe = { ...entity, familyId: entity.id, version: 1, name: 'Equilibrado', methodId: method.id, techniqueId: technique.id, dose: 20, water: 300, steps: steps([60, 60, 60, 60, 60]) };
  return { data, method, technique, recipe, steps };
}

describe('biblioteca de preparo', () => {
  it('calcula proporções e acumulados nos três exemplos, incluindo edição pelo peso acumulado', () => {
    const { data, recipe, steps } = fixture();
    expect(ratio(20, 300)).toBe('1:15'); expect(ratio(0, 300)).toBe('—');
    for (const weights of [[60, 60, 60, 60, 60], [75, 175, 125], [125, 125, 125]]) {
      const total = weights.reduce((a, b) => a + b, 0);
      const value = { ...recipe, dose: total === 300 ? 20 : 25, water: total, steps: steps(weights) };
      expect(() => applyMutation(data, { type: 'recipe', value })).not.toThrow();
      expect(value.steps.at(-1)?.cumulativeWater).toBe(total);
    }
    const changed = changeStepWater(steps([75, 175, 125]), 1, 240, true);
    expect(changed.map(s => s.water)).toEqual([75, 165, 125]);
    expect(changed.map(s => s.cumulativeWater)).toEqual([75, 240, 365]);
  });
  it('valida integridade das etapas, condições visuais, tempos, links e exclusões em uso', () => {
    const { data, method, technique, recipe } = fixture();
    const invalid: BrewRecipe[] = [
      { ...recipe, water: 301 }, { ...recipe, dose: 0 },
      { ...recipe, steps: recipe.steps.map((s, i) => i ? s : { ...s, cumulativeWater: 59 }) },
      { ...recipe, steps: recipe.steps.map((s, i) => i ? s : { ...s, advance: 'observable' }) },
      { ...recipe, steps: recipe.steps.map((s, i) => i ? s : { ...s, advance: 'time' }) },
      { ...recipe, steps: recipe.steps.map((s, i) => i ? s : { ...s, durationSeconds: -1 }) },
      { ...recipe, steps: recipe.steps.map((s, i) => i ? s : { ...s, type: 'wait' }) },
    ];
    for (const value of invalid) expect(() => applyMutation(data, { type: 'recipe', value })).toThrow();
    expect(() => applyMutation(data, { type: 'technique', value: { ...technique, sources: [{ id: 's', url: 'javascript:alert(1)' }] } })).toThrow();
    const saved = applyMutation(data, { type: 'recipe', value: recipe });
    expect(() => applyMutation(saved, { type: 'deleteMethod', id: method.id })).toThrow('em uso');
    expect(() => applyMutation(saved, { type: 'deleteTechnique', id: technique.id })).toThrow('em uso');
    const observable = { ...recipe, steps: recipe.steps.map((s, i) => i === 2 ? { ...s, advance: 'observable' as const, condition: 'Cama começando a aparecer', durationSeconds: 100 } : s) };
    expect(() => applyMutation(data, { type: 'recipe', value: observable })).not.toThrow();
  });
  it('persiste correções e versões independentes ao reabrir, sem alterar os pesos dos pacotes', async () => {
    const { method, technique, recipe } = fixture();
    const local = new IndexedDBStorage(`brew-${crypto.randomUUID()}`);
    try {
      await validateStorage(local);
      const coffee = { ...newEntity(), name: 'Referência sem restrição de uso', tried: false, favorite: false };
      const packet = { ...newEntity(), coffeeId: coffee.id, initialWeight: 250, remainingWeight: 80, adjustments: [] };
      await local.mutateCollection({ type: 'coffee', value: coffee });
      await local.mutateCollection({ type: 'package', value: packet });
      await local.mutateCollection({ type: 'method', value: method }); await local.mutateCollection({ type: 'technique', value: technique });
      await local.mutateCollection({ type: 'recipe', value: recipe });
      await local.mutateCollection({ type: 'recipe', value: { ...recipe, name: 'Nome corrigido' } });
      const entity = newEntity();
      await local.mutateCollection({ type: 'recipe', fromId: recipe.id, value: { ...recipe, ...entity, grind: '27/40', steps: changeStepWater(changeStepWater(recipe.steps, 0, 50), 1, 70) } });
      await local.close(); await local.initialize();
      const loaded = await local.loadCollection();
      expect(loaded.recipes).toHaveLength(2);
      expect(loaded.recipes.find(r => r.version === 1)).toMatchObject({ name: 'Nome corrigido', steps: recipe.steps });
      expect(loaded.recipes.find(r => r.version === 2)).toMatchObject({ familyId: recipe.id, previousVersionId: recipe.id, grind: '27/40' });
      expect(loaded.packages[0]).toMatchObject({ id: packet.id, initialWeight: 250, remainingWeight: 80, adjustments: [] });
      await expect(local.mutateCollection({ type: 'deleteRecipe', id: recipe.id })).rejects.toThrow('posteriores');
    } finally { await local.close(); }
  });
  it('migra IndexedDB 2 → 3 preservando café, pacote, foto e metadados', async () => {
    const name = `legacy2-${crypto.randomUUID()}`;
    const coffee = { ...newEntity(), name: 'Existente', tried: true, favorite: true, photoId: crypto.randomUUID() };
    const pack = { ...newEntity(), coffeeId: coffee.id, initialWeight: 250, remainingWeight: 80, adjustments: [] };
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open(name, 2);
      r.onupgradeneeded = () => {
        const db = r.result; const meta = db.createObjectStore('metadata'); meta.put('2', 'schema-version'); meta.put('preservar', 'custom');
        for (const store of ['coffees', 'packages', 'records', 'photos']) db.createObjectStore(store, { keyPath: 'id' });
        r.transaction!.objectStore('coffees').put(coffee); r.transaction!.objectStore('packages').put(pack);
        r.transaction!.objectStore('photos').put({ id: coffee.photoId, blob: new Blob(['photo'], { type: 'image/jpeg' }) });
      };
      r.onsuccess = () => { r.result.close(); resolve(); }; r.onerror = () => reject(r.error);
    });
    const local = new IndexedDBStorage(name);
    try {
      await validateStorage(local); const loaded: CollectionData = await local.loadCollection();
      expect(loaded.coffees).toEqual([coffee]); expect(loaded.packages).toEqual([pack]); expect(loaded.recipes).toEqual([]);
      expect(await local.getMetadata('custom')).toBe('preservar');
      const url = await local.photoUrl(coffee.photoId); expect(url).toMatch(/^blob:/); URL.revokeObjectURL(url!);
    } finally { await local.close(); }
  });
  it('migra SQLite 2 → 3 preservando a coleção e impondo referências e versões únicas', () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('PRAGMA foreign_keys=ON;'); sqliteVersion2.forEach(s => db.exec(s));
      db.exec("INSERT INTO coffees VALUES ('c',NULL,NULL,NULL,NULL,'café preservado'); INSERT INTO packages VALUES ('p','c',250,80,'pacote preservado');");
      db.exec('BEGIN;'); sqliteVersion3.forEach(s => db.exec(s)); db.exec('COMMIT;');
      expect(db.prepare("SELECT value FROM metadata WHERE key='schema-version'").get()?.value).toBe('3');
      expect(db.prepare("SELECT remaining_weight FROM packages WHERE id='p'").get()?.remaining_weight).toBe(80);
      db.exec("INSERT INTO methods VALUES ('m','{}'); INSERT INTO techniques VALUES ('t','m','{}'); INSERT INTO recipes VALUES ('r','r',1,NULL,'m','t','c','{}');");
      expect(() => db.exec("DELETE FROM coffees WHERE id='c'")).toThrow();
      expect(() => db.exec("DELETE FROM methods WHERE id='m'")).toThrow();
      expect(() => db.exec("INSERT INTO recipes VALUES ('r2','r',1,'r','m','t',NULL,'{}')")).toThrow();
      db.exec("INSERT INTO recipes VALUES ('r2','r',2,'r','m','t',NULL,'{}')");
      expect(() => db.exec("DELETE FROM recipes WHERE id='r'")).toThrow();
    } finally { db.close(); }
  });
});

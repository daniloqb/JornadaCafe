import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { applyMutation, emptyCollection, newEntity, type Coffee, type RelatedRecord } from '../domain/collection';
import { coffeeOptions, coffeeSearchText, legacySpeciesId, standardCoffeeOptions, type RatingKind } from '../domain/coffee-profile';
import { IndexedDBStorage } from './indexeddb-storage';
import { validateStorage } from '../domain/local-storage';
import { BrewClock } from '../domain/brew-clock';
import { makeSession } from '../domain/preparation';

const coffee = (): Coffee => ({ ...newEntity(), name: 'Café pessoal', tried: false, favorite: false });
describe('características e produtores', () => {
  it('distingue ausência, zero e dez, valida inteiros e mantém avaliação geral independente', () => {
    const base = coffee();
    expect(applyMutation(emptyCollection(), { type: 'coffee', value: base }).coffees[0].ratings).toBeUndefined();
    for (const key of ['roast', 'acidity', 'sweetness', 'intensity', 'overall'] as RatingKind[]) {
      for (const n of [0, 10]) expect(applyMutation(emptyCollection(), { type: 'coffee', value: { ...base, ratings: { [key]: n } } }).coffees[0].ratings).toEqual({ [key]: n });
      for (const n of [-1, 11, 1.5, NaN]) expect(() => applyMutation(emptyCollection(), { type: 'coffee', value: { ...base, ratings: { [key]: n } } })).toThrow('inteiros');
    }
    const value = { ...base, ratings: { acidity: 10, sweetness: 10, overall: 0 } };
    expect(applyMutation(emptyCollection(), { type: 'coffee', value }).coffees[0].ratings?.overall).toBe(0);
    expect(applyMutation(emptyCollection(), { type: 'coffee', value: { ...value, ratings: { acidity: 10 } } }).coffees[0].ratings?.overall).toBeUndefined();
  });
  it('persiste espécies e tags reutilizáveis, sem duplicação trivial, e grava padrões só quando selecionados', async () => {
    const local = new IndexedDBStorage(`profile-${crypto.randomUUID()}`);
    try {
      await validateStorage(local); const empty = await local.loadCollection();
      expect(empty.records).toEqual([]); expect(coffeeOptions(empty, 'species')).toHaveLength(3); expect(coffeeOptions(empty, 'sensoryTag')).toHaveLength(9);
      const species = standardCoffeeOptions.find(r => r.kind === 'species')!;
      const tag = standardCoffeeOptions.find(r => r.name === 'Cítrico')!;
      const first = { ...coffee(), speciesId: species.id, sensoryTagIds: [tag.id], ratings: { acidity: 0, overall: 10 } };
      await local.mutateCollection({ type: 'coffee', value: first });
      for (const [kind, name] of [['species', 'ARABICA'], ['sensoryTag', '  CITRICO  ']] as const) await expect(local.mutateCollection({ type: 'record', value: { ...newEntity(), kind, name } })).rejects.toThrow('já existe');
      const custom: RelatedRecord = { ...newEntity(), kind: 'sensoryTag', name: 'Jabuticaba' };
      await local.mutateCollection({ type: 'record', value: custom });
      const second = { ...coffee(), speciesId: species.id, sensoryTagIds: [tag.id, custom.id] };
      await local.mutateCollection({ type: 'coffee', value: second });
      await local.close(); await local.initialize(); const data = await local.loadCollection();
      expect(data.records).toHaveLength(3); expect(data.coffees.find(c => c.id === first.id)?.ratings).toEqual({ acidity: 0, overall: 10 });
      expect(coffeeSearchText(data, second)).toContain('Jabuticaba');
      await expect(local.mutateCollection({ type: 'deleteRecord', id: custom.id })).rejects.toThrow('em uso');
      const before = await local.loadCollection();
      await expect(local.mutateCollection({ type: 'coffee', value: { ...coffee(), speciesId: standardCoffeeOptions[1].id, sensoryTagIds: ['ausente'] } })).rejects.toThrow('disponível');
      expect(await local.loadCollection()).toEqual(before);
    } finally { await local.close(); }
  });
  it('valida sites e vínculos do produtor e não propaga seu local a cafés existentes', () => {
    const property: RelatedRecord = { ...newEntity(), kind: 'property', name: 'Fazenda A' };
    const other: RelatedRecord = { ...newEntity(), kind: 'property', name: 'Fazenda B' };
    const origin: RelatedRecord = { ...newEntity(), kind: 'origin', name: 'Origem A', country: 'Brasil', city: 'Município A' };
    let data = emptyCollection(); for (const value of [property, other, origin]) data = applyMutation(data, { type: 'record', value });
    const producer: RelatedRecord = { ...newEntity(), kind: 'producer', name: 'Família', website: 'https://example.org/', propertyId: property.id, originId: origin.id };
    data = applyMutation(data, { type: 'record', value: producer });
    const first = { ...coffee(), producerId: producer.id, propertyId: property.id, originId: origin.id };
    const second = { ...coffee(), producerId: producer.id, propertyId: other.id };
    for (const value of [first, second]) data = applyMutation(data, { type: 'coffee', value });
    const old = structuredClone(data.coffees);
    data = applyMutation(data, { type: 'record', value: { ...producer, propertyId: other.id } });
    expect(data.coffees).toEqual(old); expect(coffeeSearchText(data, first)).toContain('Família');
    expect(() => applyMutation(data, { type: 'record', value: { ...producer, website: 'javascript:alert(1)' } })).toThrow('site válido');
    expect(() => applyMutation(data, { type: 'record', value: { ...producer, propertyId: origin.id } })).toThrow('propriedade');
    expect(() => applyMutation(data, { type: 'deleteRecord', id: origin.id })).toThrow('em uso por um produtor');
  });
  it('abre payloads anteriores sem reescrever textos, UUIDs, fotos, locais, biblioteca ou histórico', async () => {
    const local = new IndexedDBStorage(`legacy-profile-${crypto.randomUUID()}`);
    try {
      await validateStorage(local);
      const producer: RelatedRecord = { ...newEntity(), kind: 'producer', name: 'Produtor anterior', country: 'Brasil' };
      const props: RelatedRecord[] = ['Fazenda A', 'Fazenda B'].map(name => ({ ...newEntity(), name, kind: 'property' }));
      const origins: RelatedRecord[] = ['Origem A', 'Origem B'].map(name => ({ ...newEntity(), name, kind: 'origin' }));
      const roaster: RelatedRecord = { ...newEntity(), kind: 'roaster', name: 'Empresa torrefadora anterior' };
      for (const value of [producer, ...props, ...origins, roaster]) await local.mutateCollection({ type: 'record', value });
      const first = { ...coffee(), producerId: producer.id, propertyId: props[0].id, originId: origins[0].id, roasterId: roaster.id, species: 'Arábica', roast: 'Média clara', commercialNotes: 'Chocolate com final que lembra frutas; texto não estruturado.', photoId: crypto.randomUUID() };
      const second = { ...coffee(), producerId: producer.id, propertyId: props[1].id, originId: origins[1].id, species: 'mistura anotada na embalagem' };
      await local.savePhoto(first.photoId, new Blob(['foto anterior'], { type: 'image/jpeg' }));
      for (const value of [first, second]) await local.mutateCollection({ type: 'coffee', value });
      const packet = { ...newEntity(), coffeeId: first.id, initialWeight: 250, remainingWeight: 125, adjustments: [] };
      await local.mutateCollection({ type: 'package', value: packet }); await local.mutateCollection({ type: 'importReferenceCatalog' });
      let data = await local.loadCollection(); const recipe = { ...data.recipes[0], coffeeId: first.id };
      await local.mutateCollection({ type: 'recipe', value: recipe }); data = await local.loadCollection();
      const session = makeSession(data, recipe, first.id, packet.id, Date.now());
      await local.mutateCollection({ type: 'startSession', value: session });
      await local.mutateCollection({ type: 'finishPreparation', value: new BrewClock(session, 0).preparation('completed', 'Histórico anterior', false, 1000, Date.now() + 1000) });
      data = await local.loadCollection();
      await local.mutateCollection({ type: 'startSession', value: makeSession(data, recipe, second.id) });
      await local.setMetadata('anterior', 'preservar'); const before = await local.loadCollection();
      await local.close(); await validateStorage(local); data = await local.loadCollection();
      expect(data).toEqual(before); expect(data.coffees.every(c => !c.ratings && !c.sensoryTagIds)).toBe(true);
      expect(legacySpeciesId(data, first)).toBe(standardCoffeeOptions[0].id); expect(legacySpeciesId(data, second)).toBeUndefined();
      const url = await local.photoUrl(first.photoId); expect(url).toMatch(/^blob:/); URL.revokeObjectURL(url!);
      expect(await local.getMetadata('anterior')).toBe('preservar'); expect(await local.getMetadata('schema-version')).toBe('5');
    } finally { await local.close(); }
  });
});

import { normalizeText, recordName, originDescription, type Coffee, type CollectionData, type RelatedRecord } from './collection';

export type CoffeeOptionKind = 'species' | 'sensoryTag';
export type RatingKind = 'roast' | 'acidity' | 'sweetness' | 'intensity' | 'overall';
export type CoffeeRatings = Partial<Record<RatingKind, number>>;
export const ratingLabels: Record<RatingKind, string> = { roast: 'Torra', acidity: 'Acidez', sweetness: 'Doçura', intensity: 'Intensidade', overall: 'Avaliação geral do café' };
const species = ['Arábica — Coffea arabica', 'Canephora — Coffea canephora (Robusta/Conilon)', 'Libérica — Coffea liberica'];
const tags = ['Chocolate', 'Caramelo', 'Baunilha', 'Cacau', 'Castanhas', 'Floral', 'Frutas vermelhas', 'Cítrico', 'Mel'];
/** Offline choices only. A preset is persisted with the coffee when explicitly selected. */
export const standardCoffeeOptions: RelatedRecord[] = [...species.map((name, i) => ({ name, kind: 'species' as const, n: i + 1 })), ...tags.map((name, i) => ({ name, kind: 'sensoryTag' as const, n: i + 101 }))].map(({ name, kind, n }) => ({ id: `04200000-0000-4000-8000-${String(n).padStart(12, '0')}`, kind, name, createdAt: '2026-11-15T00:00:00.000Z', updatedAt: '2026-11-15T00:00:00.000Z' }));
export const optionKey = (value: string) => normalizeText(value).replace(/\s+/g, ' ');
export function coffeeOptionKey(kind: CoffeeOptionKind, value: string) {
  const key = optionKey(value);
  if (kind !== 'species') return key;
  const aliases = [['arabica', 'coffea arabica', optionKey(species[0])], ['canephora', 'canefora', 'coffea canephora', 'robusta', 'conilon', optionKey(species[1])], ['liberica', 'coffea liberica', optionKey(species[2])]];
  return aliases.find(values => values.includes(key))?.[1] ?? key;
}
export function coffeeOptions(data: CollectionData, kind: CoffeeOptionKind) {
  const result = data.records.filter(r => r.kind === kind);
  for (const item of standardCoffeeOptions.filter(r => r.kind === kind)) if (!result.some(r => coffeeOptionKey(kind, r.name) === coffeeOptionKey(kind, item.name))) result.push(item);
  return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
export function legacySpeciesId(data: CollectionData, coffee?: Coffee) {
  if (coffee?.speciesId) return coffee.speciesId;
  if (!coffee?.species) return undefined;
  return coffeeOptions(data, 'species').find(r => coffeeOptionKey('species', r.name) === coffeeOptionKey('species', coffee.species!))?.id;
}
export function speciesName(data: CollectionData, coffee: Coffee) { return coffeeOptions(data, 'species').find(r => r.id === coffee.speciesId)?.name || coffee.species || ''; }
export function sensoryTags(data: CollectionData, coffee: Coffee) { return coffeeOptions(data, 'sensoryTag').filter(r => coffee.sensoryTagIds?.includes(r.id)); }
export function coffeeSearchText(data: CollectionData, coffee: Coffee) {
  const producer = data.records.find(r => r.id === coffee.producerId);
  return [coffee.name, coffee.description, coffee.roast, coffee.variety, coffee.process, coffee.commercialNotes, speciesName(data, coffee), ...sensoryTags(data, coffee).map(r => r.name), recordName(data, coffee.roasterId), producer?.name, recordName(data, coffee.propertyId), originDescription(data, coffee.originId), recordName(data, producer?.propertyId), originDescription(data, producer?.originId), producer?.region, producer?.city, producer?.state, producer?.country].filter(Boolean).join(' ');
}

import { applyBrewingMutation, type BrewMethod, type BrewTechnique, type BrewRecipe, type BrewingMutation } from './brewing';

export type RecordKind = 'producer' | 'property' | 'origin' | 'roaster';
export const recordLabels: Record<RecordKind, string> = { producer: 'Produtor', property: 'Propriedade', origin: 'Origem', roaster: 'Torrefação' };
export interface Entity { id: string; createdAt: string; updatedAt: string }
export interface RelatedRecord extends Entity {
  kind: RecordKind; name: string; country?: string; state?: string; city?: string; region?: string; description?: string; additional?: string;
}
export interface Coffee extends Entity {
  name: string; roasterId?: string; producerId?: string; propertyId?: string; originId?: string;
  photoId?: string; description?: string; altitude?: number; species?: string; variety?: string;
  process?: string; roast?: string; commercialNotes?: string; additional?: string; tried: boolean; favorite: boolean;
}
export interface StockAdjustment { id: string; at: string; previous: number; remaining: number; initial: number; reason?: string }
export interface CoffeePackage extends Entity {
  coffeeId: string; description?: string; initialWeight: number; remainingWeight: number;
  purchasedOn?: string; roastedOn?: string; openedOn?: string; lot?: string; price?: number;
  purchasedAt?: string; notes?: string; adjustments: StockAdjustment[];
}
export interface CollectionData { coffees: Coffee[]; packages: CoffeePackage[]; records: RelatedRecord[]; methods: BrewMethod[]; techniques: BrewTechnique[]; recipes: BrewRecipe[] }
export type CollectionMutation = { type: 'coffee'; value: Coffee } | { type: 'package'; value: CoffeePackage; reason?: string }
  | { type: 'record'; value: RelatedRecord } | { type: 'deleteCoffee'; id: string } | { type: 'deleteRecord'; id: string } | BrewingMutation;
export const emptyCollection = (): CollectionData => ({ coffees: [], packages: [], records: [], methods: [], techniques: [], recipes: [] });
export const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
export function newEntity(): Entity { const now = new Date().toISOString(); return { id: crypto.randomUUID(), createdAt: now, updatedAt: now }; }
export const relationFields = { producerId: 'producer', propertyId: 'property', originId: 'origin', roasterId: 'roaster' } as const;
export const grams = (value: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} g`;
export function inventory(data: CollectionData, id: string) {
  const packages = data.packages.filter(p => p.coffeeId === id);
  return { total: packages.reduce((sum, p) => sum + p.remainingWeight, 0), active: packages.filter(p => p.remainingWeight > 0).length, everOwned: packages.length > 0 };
}
export function associatedCoffees(data: CollectionData, id: string) { return data.coffees.filter(c => Object.keys(relationFields).some(key => c[key as keyof typeof relationFields] === id)); }
export function recordName(data: CollectionData, id?: string) { return data.records.find(r => r.id === id)?.name ?? ''; }
export function originDescription(data: CollectionData, id?: string) {
  const record = data.records.find(r => r.id === id);
  return record ? [...new Set([record.name, record.region, record.city, record.state, record.country].filter(Boolean))].join(' · ') : '';
}
export function shelfCoffees(data: CollectionData) {
  const recent = (c: Coffee) => Math.max(Date.parse(c.createdAt), ...data.packages.filter(p => p.coffeeId === c.id).map(p => Date.parse(p.createdAt)));
  return [...data.coffees].sort((a, b) => Number(b.favorite) - Number(a.favorite) || recent(b) - recent(a));
}

/** Shared rules; both adapters apply these inside their write transaction. */
export function applyMutation(data: CollectionData, mutation: CollectionMutation): CollectionData {
  const brewing = applyBrewingMutation(data, mutation);
  if (brewing) return brewing;
  const next = { ...data, coffees: [...data.coffees], packages: [...data.packages], records: [...data.records] };
  const upsert = <T extends Entity>(items: T[], value: T) => {
    if (!value.id || !Number.isFinite(Date.parse(value.createdAt))) throw new Error('Registro sem identificação ou data válida.');
    const index = items.findIndex(item => item.id === value.id);
    const saved = { ...value, createdAt: index >= 0 ? items[index].createdAt : value.createdAt, updatedAt: new Date().toISOString() };
    if (index >= 0) items[index] = saved; else items.push(saved);
  };
  if (mutation.type === 'coffee') {
    const value = { ...mutation.value, name: mutation.value.name.trim() };
    if (!value.name) throw new Error('Informe o nome do café.');
    if (value.altitude !== undefined && (!Number.isFinite(value.altitude) || value.altitude < 0)) throw new Error('Informe uma altitude válida.');
    for (const [key, kind] of Object.entries(relationFields)) {
      const id = value[key as keyof typeof relationFields];
      if (id && !data.records.some(r => r.id === id && r.kind === kind)) throw new Error('Uma referência de origem ou produção não está disponível. Selecione novamente.');
    }
    upsert(next.coffees, value);
  } else if (mutation.type === 'record') {
    const value = { ...mutation.value, name: mutation.value.name.trim() };
    if (!value.name || !(value.kind in recordLabels)) throw new Error('Informe um nome e um tipo de registro válidos.');
    const existing = data.records.find(r => r.id === value.id);
    if (existing && existing.kind !== value.kind) throw new Error('O tipo de um registro existente não pode ser alterado.');
    upsert(next.records, value);
  } else if (mutation.type === 'package') {
    const value = { ...mutation.value };
    if (!data.coffees.some(c => c.id === value.coffeeId)) throw new Error('O café deste pacote não está disponível.');
    if (!Number.isFinite(value.initialWeight) || value.initialWeight <= 0) throw new Error('O peso inicial deve ser maior que zero.');
    if (!Number.isFinite(value.remainingWeight) || value.remainingWeight < 0 || value.remainingWeight > value.initialWeight) throw new Error('O peso restante deve ficar entre zero e o peso inicial.');
    if (value.price !== undefined && (!Number.isFinite(value.price) || value.price < 0)) throw new Error('Informe um preço válido.');
    for (const date of [value.purchasedOn, value.roastedOn, value.openedOn]) {
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('Informe uma data válida.');
    }
    const old = data.packages.find(p => p.id === value.id);
    if (old && old.coffeeId !== value.coffeeId) throw new Error('Um pacote não pode mudar de café.');
    value.adjustments = old ? [...old.adjustments] : [];
    if (old && (old.remainingWeight !== value.remainingWeight || old.initialWeight !== value.initialWeight)) {
      value.adjustments.push({ id: crypto.randomUUID(), at: new Date().toISOString(), previous: old.remainingWeight, remaining: value.remainingWeight, initial: value.initialWeight, reason: mutation.reason?.trim() || undefined });
    }
    upsert(next.packages, value);
  } else if (mutation.type === 'deleteRecord') {
    if (associatedCoffees(data, mutation.id).length) throw new Error('Este registro está em uso. Edite os cafés associados para desvincular ou substituir a referência antes de excluir.');
    next.records = next.records.filter(r => r.id !== mutation.id);
  } else if (mutation.type === 'deleteCoffee') {
    if (data.recipes.some(r => r.coffeeId === mutation.id)) throw new Error('Este café é referência de uma receita. Remova ou substitua a referência nas receitas e suas versões antes de excluir.');
    next.coffees = next.coffees.filter(c => c.id !== mutation.id);
    next.packages = next.packages.filter(p => p.coffeeId !== mutation.id);
  }
  return next;
}

export const collectionTables = ['coffees', 'packages', 'records', 'methods', 'techniques', 'recipes'] as const;
export type CollectionTable = typeof collectionTables[number];
/** Only changed entities are written, with shared validation inside the transaction. */
export function collectionChanges(before: CollectionData, after: CollectionData) {
  return collectionTables.flatMap(table => {
    const previous = new Map<string, Entity>(before[table].map(item => [item.id, item]));
    const current = new Map<string, Entity>(after[table].map(item => [item.id, item]));
    return [
      ...before[table].filter(item => !current.has(item.id)).map(item => ({ table, id: item.id, value: undefined as Entity | undefined })),
      ...after[table].filter(item => previous.get(item.id) !== item).map(value => ({ table, id: value.id, value: value as Entity | undefined })),
    ];
  });
}

import { coffeeOptions, coffeeOptionKey, ratingLabels, standardCoffeeOptions, type CoffeeRatings, type CoffeeOptionKind } from './coffee-profile';
import { safeReferenceUrl } from './brewing';
import { importReference, importReferenceCatalog, type ReferenceMutation } from '../reference/import-reference';
import { applyPreparationMutation, type BrewSession, type Preparation, type PreparationMutation } from './preparation';
import { applyBrewingMutation, type BrewMethod, type BrewTechnique, type BrewRecipe, type BrewingMutation } from './brewing';

export type RecordKind = 'producer' | 'property' | 'origin' | 'roaster' | 'species' | 'sensoryTag';
export const recordLabels: Record<RecordKind, string> = { producer: 'Produtor', property: 'Propriedade', origin: 'Origem', roaster: 'Empresa torrefadora', species: 'Espécie', sensoryTag: 'Nota sensorial' };
export interface Entity { id: string; createdAt: string; updatedAt: string }
export interface RelatedRecord extends Entity {
  kind: RecordKind; name: string; photoId?: string; website?: string; propertyId?: string; originId?: string; country?: string; state?: string; city?: string; region?: string; description?: string; additional?: string;
}
export interface Coffee extends Entity {
  name: string; roasterId?: string; producerId?: string; propertyId?: string; originId?: string;
  photoId?: string; description?: string; altitude?: number; species?: string; variety?: string;
  speciesId?: string; sensoryTagIds?: string[]; ratings?: CoffeeRatings;
  process?: string; roast?: string; commercialNotes?: string; additional?: string; tried: boolean; favorite: boolean;
}
export interface StockAdjustment { id: string; at: string; previous: number; remaining: number; initial: number; reason?: string }
export interface CoffeePackage extends Entity {
  coffeeId: string; description?: string; initialWeight: number; remainingWeight: number;
  purchasedOn?: string; roastedOn?: string; openedOn?: string; lot?: string; price?: number;
  purchasedAt?: string; notes?: string; adjustments: StockAdjustment[];
}
export interface CollectionData { coffees: Coffee[]; packages: CoffeePackage[]; records: RelatedRecord[]; methods: BrewMethod[]; techniques: BrewTechnique[]; recipes: BrewRecipe[]; preparations: Preparation[]; sessions: BrewSession[] }
export type CollectionMutation = { type: 'coffee'; value: Coffee } | { type: 'package'; value: CoffeePackage; reason?: string }
  | { type: 'record'; value: RelatedRecord } | { type: 'deleteCoffee'; id: string } | { type: 'deleteRecord'; id: string } | BrewingMutation | PreparationMutation | ReferenceMutation;
export const emptyCollection = (): CollectionData => ({ coffees: [], packages: [], records: [], methods: [], techniques: [], recipes: [], preparations: [], sessions: [] });
export const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
export function newEntity(): Entity { const now = new Date().toISOString(); return { id: crypto.randomUUID(), createdAt: now, updatedAt: now }; }
export const relationFields = { producerId: 'producer', propertyId: 'property', originId: 'origin', roasterId: 'roaster' } as const;
export const grams = (value: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} g`;
export function inventory(data: CollectionData, id: string) {
  const packages = data.packages.filter(p => p.coffeeId === id);
  return { total: packages.reduce((sum, p) => sum + p.remainingWeight, 0), active: packages.filter(p => p.remainingWeight > 0).length, everOwned: packages.length > 0 };
}
export function associatedCoffees(data: CollectionData, id: string) { return data.coffees.filter(c => Object.keys(relationFields).some(key => c[key as keyof typeof relationFields] === id) || c.speciesId === id || c.sensoryTagIds?.includes(id)); }
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
  if (mutation.type === 'importReferenceCatalog') return importReferenceCatalog(data);
  if (mutation.type === 'importReference') return importReference(data, mutation);
  const preparation = applyPreparationMutation(data, mutation);
  if (preparation) return preparation;
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
    for (const [key, rating] of Object.entries(value.ratings ?? {})) {
      if (!(key in ratingLabels) || (rating !== undefined && (!Number.isInteger(rating) || rating < 0 || rating > 10))) throw new Error('As avaliações devem ser números inteiros de 0 a 10 ou ficar sem informação.');
    }
    const resolveOption = (id: string, kind: CoffeeOptionKind) => {
      if (next.records.some(r => r.id === id && r.kind !== kind)) throw new Error('A identificação da opção já está em uso por outro tipo de registro.');
      const saved = next.records.find(r => r.id === id && r.kind === kind);
      if (saved) return saved.id;
      const preset = standardCoffeeOptions.find(r => r.id === id && r.kind === kind);
      if (!preset) throw new Error('Selecione uma espécie ou nota sensorial disponível.');
      const duplicate = next.records.find(r => r.kind === kind && coffeeOptionKey(kind, r.name) === coffeeOptionKey(kind, preset.name));
      if (duplicate) return duplicate.id;
      upsert(next.records, { ...preset, createdAt: new Date().toISOString() });
      return preset.id;
    };
    if (value.speciesId) value.speciesId = resolveOption(value.speciesId, 'species');
    if (value.sensoryTagIds) value.sensoryTagIds = [...new Set(value.sensoryTagIds.map(id => resolveOption(id, 'sensoryTag')))];
    upsert(next.coffees, value);
  } else if (mutation.type === 'record') {
    const value = { ...mutation.value, name: mutation.value.name.trim() };
    if (!value.name || !(value.kind in recordLabels)) throw new Error('Informe um nome e um tipo de registro válidos.');
    const existing = data.records.find(r => r.id === value.id);
    if (existing && existing.kind !== value.kind) throw new Error('O tipo de um registro existente não pode ser alterado.');
    if (value.kind === 'species' || value.kind === 'sensoryTag') {
      if (coffeeOptions(data, value.kind).some(r => r.id !== value.id && coffeeOptionKey(value.kind as CoffeeOptionKind, r.name) === coffeeOptionKey(value.kind as CoffeeOptionKind, value.name))) throw new Error('Esta opção já existe. Selecione o registro disponível.');
    }
    if (value.website && !safeReferenceUrl(value.website)) throw new Error('Informe um site válido começando por http:// ou https://.');
    if (value.kind === 'producer') {
      for (const [key, kind] of [['propertyId', 'property'], ['originId', 'origin']] as const) if (value[key] && !data.records.some(r => r.id === value[key] && r.kind === kind)) throw new Error('Selecione uma propriedade ou origem disponível para o produtor.');
    }
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
    if (data.records.some(r => r.kind === 'producer' && (r.propertyId === mutation.id || r.originId === mutation.id))) throw new Error('Este registro está em uso por um produtor. Desvincule ou substitua a referência antes de excluir.');
    if (associatedCoffees(data, mutation.id).length) throw new Error('Este registro está em uso. Edite os cafés associados para desvincular ou substituir a referência antes de excluir.');
    next.records = next.records.filter(r => r.id !== mutation.id);
  } else if (mutation.type === 'deleteCoffee') {
    if (data.sessions.some(s => s.snapshot.coffee?.id === mutation.id)) throw new Error('Este café está em um preparo em andamento. Conclua ou descarte a sessão antes de excluir.');
    if (data.recipes.some(r => r.coffeeId === mutation.id)) throw new Error('Este café é referência de uma receita. Remova ou substitua a referência nas receitas e suas versões antes de excluir.');
    next.coffees = next.coffees.filter(c => c.id !== mutation.id);
    next.packages = next.packages.filter(p => p.coffeeId !== mutation.id);
  }
  return next;
}

export const collectionTables = ['coffees', 'packages', 'records', 'methods', 'techniques', 'recipes', 'preparations', 'sessions'] as const;
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

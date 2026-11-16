import type { CollectionData, Entity } from './collection';

export interface ReferenceOrigin { referenceKey?: string }
export interface BrewMethod extends Entity, ReferenceOrigin { name: string; description?: string; photoId?: string; notes?: string }
export interface SourceReference { id: string; title?: string; author?: string; url?: string; notes?: string }
export interface BrewTechnique extends Entity, ReferenceOrigin {
  name: string; methodId?: string; creator?: string; sources: SourceReference[];
  principle?: string; guidance?: string; notes?: string; photoId?: string;
}
export type StepType = 'pour' | 'wait' | 'manual' | 'finish';
export type AdvanceCondition = 'manual' | 'time' | 'observable';
export interface RecipeStep {
  id: string; order: number; name: string; type: StepType;
  water: number; cumulativeWater: number;
  startSeconds?: number; durationSeconds?: number;
  advance: AdvanceCondition; condition?: string; notes?: string;
}
export interface BrewRecipe extends Entity, ReferenceOrigin {
  familyId: string; version: number; previousVersionId?: string; versionNote?: string;
  name: string; methodId: string; techniqueId?: string; coffeeId?: string;
  dose: number; water: number; temperature?: number; grind?: string; grinder?: string; filter?: string;
  estimatedSeconds?: number; notes?: string; source?: SourceReference; steps: RecipeStep[];
}
export type BrewingMutation = { type: 'method'; value: BrewMethod } | { type: 'technique'; value: BrewTechnique }
  | { type: 'recipe'; value: BrewRecipe; fromId?: string }
  | { type: 'deleteMethod' | 'deleteTechnique' | 'deleteRecipe'; id: string };
export const stepLabels: Record<StepType, string> = { pour: 'Despejo', wait: 'Espera', manual: 'Ação manual', finish: 'Finalização' };
export const advanceLabels: Record<AdvanceCondition, string> = { manual: 'Confirmação manual', time: 'Tempo definido', observable: 'Condição observável' };
export const formatNumber = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n);
export const ratio = (dose: number, water: number) => Number.isFinite(dose) && Number.isFinite(water) && dose > 0 && water > 0 ? `1:${formatNumber(water / dose)}` : '—';
export const secondsLabel = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
export function latestRecipes(recipes: BrewRecipe[]) {
  return recipes.filter(r => !recipes.some(other => other.familyId === r.familyId && other.version > r.version));
}
export function safeReferenceUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
/** Water is always stored both as the added amount and the cumulative scale reading. */
export function recalculateSteps(steps: RecipeStep[]): RecipeStep[] {
  let total = 0;
  return steps.map((step, order) => { total = Math.round((total + step.water) * 10000) / 10000; return { ...step, order, cumulativeWater: total }; });
}
export function changeStepWater(steps: RecipeStep[], index: number, value: number, accumulated = false) {
  const previous = index ? steps[index - 1].cumulativeWater : 0;
  return recalculateSteps(steps.map((step, i) => i === index ? { ...step, water: accumulated ? value - previous : value } : step));
}
function validateSources(sources: SourceReference[]) {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source.id || ids.has(source.id)) throw new Error('Cada fonte precisa de uma identificação distinta.');
    ids.add(source.id);
    if (source.url && !safeReferenceUrl(source.url)) throw new Error('Informe links completos, começando por https:// ou http://.');
  }
}
export function validateRecipe(recipe: BrewRecipe, data: CollectionData) {
  if (!data.methods.some(m => m.id === recipe.methodId)) throw new Error('Selecione um método disponível.');
  const technique = data.techniques.find(t => t.id === recipe.techniqueId);
  if (recipe.techniqueId && !technique) throw new Error('Selecione uma técnica disponível.');
  if (technique?.methodId && technique.methodId !== recipe.methodId) throw new Error('A técnica selecionada pertence a outro método.');
  if (recipe.coffeeId && !data.coffees.some(c => c.id === recipe.coffeeId)) throw new Error('O café de referência não está disponível.');
  if (![recipe.dose, recipe.water].every(v => Number.isFinite(v) && v > 0)) throw new Error('A dose de café e a água devem ser maiores que zero.');
  if (recipe.temperature !== undefined && (!Number.isFinite(recipe.temperature) || recipe.temperature <= 0 || recipe.temperature > 100)) throw new Error('Informe uma temperatura entre 0 e 100 °C.');
  const time = (n?: number) => n === undefined || (Number.isInteger(n) && n >= 0);
  if (!time(recipe.estimatedSeconds)) throw new Error('O tempo estimado deve ser informado em segundos inteiros, a partir de zero.');
  if (!recipe.steps.length) throw new Error('Adicione pelo menos uma etapa.');
  let sum = 0;
  let lastStart = 0;
  const ids = new Set<string>();
  for (const [index, step] of recipe.steps.entries()) {
    if (!step.id || ids.has(step.id)) throw new Error('Cada etapa precisa de uma identificação distinta.');
    ids.add(step.id);
    if (!step.name.trim() || step.order !== index || !(step.type in stepLabels) || !(step.advance in advanceLabels)) throw new Error('Revise o nome, o tipo e a ordem das etapas.');
    if (!Number.isFinite(step.water) || step.water < 0 || !Number.isFinite(step.cumulativeWater)) throw new Error('A água de cada etapa deve ser zero ou maior.');
    if (step.type !== 'pour' && step.water !== 0) throw new Error('Apenas etapas de despejo podem adicionar água.');
    sum += step.water;
    if (Math.abs(sum - step.cumulativeWater) > 0.001) throw new Error('Os pesos acumulados das etapas não correspondem à água adicionada.');
    if (!time(step.startSeconds) || !time(step.durationSeconds)) throw new Error('Os tempos das etapas devem ser segundos inteiros, a partir de zero.');
    if (step.startSeconds !== undefined) {
      if (step.startSeconds < lastStart) throw new Error('Os tempos absolutos devem seguir a ordem das etapas.');
      lastStart = step.startSeconds;
    }
    if (step.advance === 'time' && !(step.durationSeconds !== undefined && step.durationSeconds > 0)) throw new Error('Para avançar por tempo, informe uma duração maior que zero.');
    if (step.advance === 'observable' && !step.condition?.trim()) throw new Error('Descreva a condição observável para avançar.');
  }
  if (Math.abs(sum - recipe.water) > 0.001) throw new Error('O acumulado final das etapas deve corresponder à água total da receita.');
  if (recipe.source) validateSources([recipe.source]);
}

/** Returns undefined for mutations owned by the coffee collection. */
export function applyBrewingMutation(data: CollectionData, mutation: { type: string }): CollectionData | undefined {
  if (!['method', 'technique', 'recipe', 'deleteMethod', 'deleteTechnique', 'deleteRecipe'].includes(mutation.type)) return undefined;
  const action = mutation as BrewingMutation;
  const next = { ...data, methods: [...data.methods], techniques: [...data.techniques], recipes: [...data.recipes] };
  const upsert = <T extends Entity & { name: string }>(items: T[], value: T) => {
    if (!value.id || !Number.isFinite(Date.parse(value.createdAt)) || !value.name.trim()) throw new Error('Informe um nome e uma identificação válida.');
    const index = items.findIndex(v => v.id === value.id);
    const saved = { ...value, name: value.name.trim(), createdAt: index < 0 ? value.createdAt : items[index].createdAt, updatedAt: new Date().toISOString() };
    if (index < 0) items.push(saved); else items[index] = saved;
  };
  if (action.type === 'method') upsert(next.methods, action.value);
  else if (action.type === 'technique') {
    const value = action.value;
    if (value.methodId && !data.methods.some(m => m.id === value.methodId)) throw new Error('O método da técnica não está disponível.');
    if (value.methodId && data.recipes.some(r => r.techniqueId === value.id && r.methodId !== value.methodId)) throw new Error('Há receitas desta técnica com outro método. Revise as receitas antes de alterar o método da técnica.');
    validateSources(value.sources);
    upsert(next.techniques, value);
  } else if (action.type === 'recipe') {
    const value = { ...action.value };
    const old = data.recipes.find(r => r.id === value.id);
    if (action.fromId) {
      const previous = data.recipes.find(r => r.id === action.fromId);
      if (!previous || old) throw new Error('A versão anterior não está disponível ou a nova identificação já está em uso.');
      value.familyId = previous.familyId;
      value.referenceKey = previous.referenceKey;
      value.previousVersionId = previous.id;
      value.version = Math.max(...data.recipes.filter(r => r.familyId === previous.familyId).map(r => r.version)) + 1;
    } else if (old) {
      value.familyId = old.familyId; value.version = old.version; value.previousVersionId = old.previousVersionId;
    } else {
      value.familyId = value.id; value.version = 1; value.previousVersionId = undefined;
    }
    validateRecipe(value, data);
    upsert(next.recipes, value);
  } else if (action.type === 'deleteMethod') {
    if (data.techniques.some(t => t.methodId === action.id) || data.recipes.some(r => r.methodId === action.id)) throw new Error('Este método está em uso por técnicas ou receitas. Desvincule ou substitua as referências antes de excluir.');
    next.methods = next.methods.filter(m => m.id !== action.id);
  } else if (action.type === 'deleteTechnique') {
    if (data.recipes.some(r => r.techniqueId === action.id)) throw new Error('Esta técnica está em uso por receitas. Desvincule ou substitua a referência antes de excluir.');
    next.techniques = next.techniques.filter(t => t.id !== action.id);
  } else if (action.type === 'deleteRecipe') {
    if (data.recipes.some(r => r.previousVersionId === action.id)) throw new Error('Esta versão tem versões posteriores. Exclua as mais recentes primeiro para preservar o histórico.');
    next.recipes = next.recipes.filter(r => r.id !== action.id);
  }
  return next;
}

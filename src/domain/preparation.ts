import { newEntity, type CollectionData, type Entity, type Coffee, type CoffeePackage } from './collection';
import { recalculateSteps, validateRecipe, type BrewMethod, type BrewRecipe, type BrewTechnique, type RecipeStep } from './brewing';

export interface PreparationSnapshot {
  recipe: BrewRecipe; method: BrewMethod; technique?: BrewTechnique; coffee?: Coffee; packet?: CoffeePackage;
}
export interface StepExecution { id: string; stepId: string; enteredMs: number; leftMs?: number; exit?: 'manual' | 'automatic' | 'previous' | 'completed' | 'interrupted' }
export interface BrewSession extends Entity {
  snapshot: PreparationSnapshot; startedAt: string; checkpointAt: string; elapsedMs: number;
  status: 'running' | 'paused'; stepIndex: number; stepStartedMs: number; executions: StepExecution[];
  needsConfirmation: boolean;
}
export interface Preparation extends Entity {
  snapshot: PreparationSnapshot; startedAt: string; finishedAt: string; elapsedMs: number;
  executions: StepExecution[]; state: 'completed' | 'interrupted'; notes?: string; consumedGrams: number;
}
export type PreparationMutation = { type: 'startSession' | 'checkpoint'; value: BrewSession }
  | { type: 'discardSession'; id: string } | { type: 'finishPreparation'; value: Preparation };
export function scaleStepWater(steps: RecipeStep[], water: number) {
  const total = steps.reduce((sum, step) => sum + step.water, 0);
  if (!Number.isFinite(water) || water <= 0 || !Number.isFinite(total) || total <= 0 || steps.some(step => !Number.isFinite(step.water) || step.water < 0)) throw new Error('Informe uma água total válida e pelo menos um despejo com água.');
  let assigned = 0; let last = steps.length - 1; while (last >= 0 && steps[last].water === 0) last--;
  return recalculateSteps(steps.map((step, index) => {
    const amount = index === last ? Math.round((water - assigned) * 10000) / 10000 : Math.round(step.water / total * water * 10000) / 10000;
    assigned += amount; return { ...step, water: amount };
  }));
}
export function makeSession(data: CollectionData, recipe: BrewRecipe, coffeeId?: string, packageId?: string, now = Date.now(), status: BrewSession['status'] = 'paused'): BrewSession {
  validateRecipe(recipe, data);
  const original = data.recipes.find(r => r.id === recipe.id && r.version === recipe.version);
  if (!original) throw new Error('A receita selecionada não está mais disponível.');
  const method = data.methods.find(m => m.id === recipe.methodId)!;
  const technique = data.techniques.find(t => t.id === recipe.techniqueId);
  const coffee = data.coffees.find(c => c.id === coffeeId);
  const packet = data.packages.find(p => p.id === packageId);
  if (coffeeId && !coffee) throw new Error('Selecione um café disponível.');
  if (packageId && (!packet || packet.coffeeId !== coffeeId)) throw new Error('Selecione um pacote deste café.');
  if (packet && packet.remainingWeight < recipe.dose) throw new Error('O pacote não tem estoque suficiente para esta dose.');
  const entity = newEntity(); const at = new Date(now).toISOString();
  return { ...entity, startedAt: at, checkpointAt: at, snapshot: structuredClone({ recipe, method, technique, coffee, packet }), elapsedMs: 0, status, stepIndex: 0, stepStartedMs: 0, executions: [{ id: crypto.randomUUID(), stepId: recipe.steps[0].id, enteredMs: 0 }], needsConfirmation: false };
}
function validateSession(value: BrewSession) {
  const steps = value.snapshot.recipe.steps;
  if (!value.id || !Number.isFinite(Date.parse(value.startedAt)) || !Number.isFinite(Date.parse(value.checkpointAt)) || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0 || !Number.isInteger(value.stepIndex) || !steps[value.stepIndex] || !Number.isFinite(value.stepStartedMs) || value.stepStartedMs < 0 || value.stepStartedMs > value.elapsedMs || !['running','paused'].includes(value.status)) throw new Error('O checkpoint do preparo é inválido.');
  if (!value.executions.length || value.executions.some(e => !steps.some(s => s.id === e.stepId) || !Number.isFinite(e.enteredMs) || e.enteredMs < 0 || e.enteredMs > value.elapsedMs || (e.leftMs !== undefined && (!Number.isFinite(e.leftMs) || e.leftMs < e.enteredMs || e.leftMs > value.elapsedMs)))) throw new Error('Os tempos das etapas são inválidos.');
}
export function applyPreparationMutation(data: CollectionData, mutation: { type: string }): CollectionData | undefined {
  if (!['startSession','checkpoint','discardSession','finishPreparation'].includes(mutation.type)) return undefined;
  const action = mutation as PreparationMutation;
  const next = { ...data, sessions: [...data.sessions], preparations: [...data.preparations], packages: [...data.packages] };
  if (action.type === 'startSession') {
    if (data.sessions.length) throw new Error('Há um preparo em andamento. Retome ou descarte antes de iniciar outro.');
    if (data.preparations.some(p => p.id === action.value.id)) throw new Error('Este preparo já foi salvo.');
    validateSession(action.value);
    const snap = action.value.snapshot;
    makeSession(data, snap.recipe, snap.coffee?.id, snap.packet?.id);
    next.sessions = [structuredClone(action.value)];
  } else if (action.type === 'checkpoint') {
    const old = data.sessions.find(s => s.id === action.value.id);
    // Late writes from a closed session cannot resurrect it.
    if (!old) return data;
    validateSession(action.value);
    if (JSON.stringify(old.snapshot) !== JSON.stringify(action.value.snapshot) || old.startedAt !== action.value.startedAt) throw new Error('Os parâmetros de um preparo iniciado não podem ser substituídos.');
    next.sessions = [{ ...action.value, updatedAt: new Date().toISOString() }];
  } else if (action.type === 'discardSession') next.sessions = data.sessions.filter(s => s.id !== action.id);
  else if (action.type === 'finishPreparation') {
    if (data.preparations.some(p => p.id === action.value.id)) return data; // Idempotent, including after a lost response.
    const session = data.sessions.find(s => s.id === action.value.id);
    if (!session) throw new Error('A sessão não está disponível. Confira o histórico antes de tentar novamente.');
    const value = action.value;
    if (JSON.stringify(value.snapshot) !== JSON.stringify(session.snapshot) || value.startedAt !== session.startedAt || !['completed','interrupted'].includes(value.state) || !Number.isFinite(Date.parse(value.finishedAt)) || Date.parse(value.finishedAt) < Date.parse(value.startedAt) || !Number.isFinite(value.elapsedMs) || value.elapsedMs < session.elapsedMs) throw new Error('O registro não corresponde à sessão iniciada.');
    validateSession({ ...session, elapsedMs: value.elapsedMs, executions: value.executions });
    const packetId = session.snapshot.packet?.id;
    const dose = session.snapshot.recipe.dose;
    const consume = packetId && value.state === 'completed' ? dose : value.consumedGrams;
    if (!Number.isFinite(consume) || (consume !== 0 && consume !== dose) || (!packetId && consume !== 0)) throw new Error('Confirme o consumo da dose configurada para este preparo.');
    if (consume > 0) {
      const packet = data.packages.find(p => p.id === packetId);
      if (!packet || packet.remainingWeight < consume) throw new Error('O estoque do pacote mudou ou não é suficiente. Confira o estoque; você também pode salvar como interrompido sem consumo.');
      const remainingWeight = Math.round((packet.remainingWeight - consume) * 10000) / 10000;
      next.packages = data.packages.map(p => p.id === packet.id ? { ...p, remainingWeight, updatedAt: value.finishedAt, adjustments: [...p.adjustments, { id: value.id, at: value.finishedAt, previous: p.remainingWeight, remaining: remainingWeight, initial: p.initialWeight, reason: `Consumo do preparo ${value.id}${value.state === 'interrupted' ? ' (confirmado manualmente)' : ''}` }] } : p);
    }
    next.preparations.push(structuredClone({ ...value, consumedGrams: consume }));
    next.sessions = next.sessions.filter(s => s.id !== value.id);
  }
  return next;
}

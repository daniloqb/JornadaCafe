import { normalizeText, type CollectionData } from './collection';
import { ratio } from './brewing';
import { localDay, sensoryFields, type Reflection } from './journey';
import type { Preparation } from './preparation';

export const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
export const completedExperiences = (data: CollectionData) => data.preparations.filter(p => p.state === 'completed').sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt) || a.id.localeCompare(b.id));
const tagKey = (value: string) => normalizeText(value).replace(/\s+/g, ' ');
export function recurringSensations(preparations: Preparation[]) {
  const tags = new Map<string, { name: string; preparationIds: string[] }>();
  for (const p of preparations.filter(p => p.state === 'completed')) {
    for (const name of p.evaluation?.tags ?? []) {
      const key = tagKey(name); if (!key) continue;
      const entry = tags.get(key) ?? { name: name.trim(), preparationIds: [] };
      if (!entry.preparationIds.includes(p.id)) entry.preparationIds.push(p.id);
      tags.set(key, entry);
    }
  }
  return [...tags.values()].sort((a, b) => b.preparationIds.length - a.preparationIds.length || a.name.localeCompare(b.name, 'pt-BR'));
}
export function sensoryProfile(preparations: Preparation[]) {
  const completed = preparations.filter(p => p.state === 'completed');
  return Object.entries(sensoryFields).map(([key, label]) => {
    const field = key as keyof typeof sensoryFields;
    const records = completed.filter(p => isScore(p.evaluation?.[field]));
    return { key: field, label, count: records.length, value: records.length ? records.reduce((n, p) => n + p.evaluation![field]!, 0) / records.length : undefined, preparationIds: records.map(p => p.id) };
  });
}
export function coffeeExperiences(data: CollectionData) {
  const groups = new Map<string, { id: string; name: string; photoId?: string; exists: boolean; preparations: Preparation[] }>();
  for (const p of completedExperiences(data)) {
    const snapshot = p.snapshot.coffee;
    if (!snapshot?.id) continue;
    const current = data.coffees.find(c => c.id === snapshot.id);
    const group = groups.get(snapshot.id) ?? { id: snapshot.id, name: current?.name ?? snapshot.name, photoId: current?.photoId ?? snapshot.photoId, exists: !!current, preparations: [] };
    group.preparations.push(p); groups.set(group.id, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
}
export function comparisonPreparations(data: CollectionData, coffeeId: string, ids: string[]) {
  if (ids.length < 2 || ids.length > 3 || new Set(ids).size !== ids.length) throw new Error('Selecione de dois a três preparos diferentes.');
  const group = coffeeExperiences(data).find(g => g.id === coffeeId);
  return ids.map(id => {
    const p = group?.preparations.find(p => p.id === id);
    if (!p) throw new Error('Selecione preparos concluídos do mesmo café.');
    return p;
  });
}
export function highestRated(preparations: Preparation[]) {
  const coffee = preparations[0]?.snapshot.coffee?.id;
  if (!coffee || preparations.some(p => p.state !== 'completed' || p.snapshot.coffee?.id !== coffee)) return [];
  const rated = preparations.filter(p => isScore(p.evaluation?.overall));
  if (rated.length < 2) return [];
  const max = Math.max(...rated.map(p => p.evaluation!.overall!));
  return rated.filter(p => p.evaluation!.overall === max).map(p => p.id);
}
export interface DiscoveryObservation { id: string; text: string; preparationIds: string[]; criterion: string }
export function coffeeObservations(preparations: Preparation[]): DiscoveryObservation[] {
  const completed = preparations.filter(p => p.state === 'completed');
  const coffee = completed[0]?.snapshot.coffee;
  if (!coffee?.id || completed.some(p => p.snapshot.coffee?.id !== coffee.id)) return [];
  const result: DiscoveryObservation[] = [{ id: `count:${coffee.id}`, text: `Você registrou ${completed.length} ${completed.length === 1 ? 'preparo concluído' : 'preparos concluídos'} deste café.`, preparationIds: completed.map(p => p.id), criterion: 'Contagem de preparos concluídos com a mesma identificação de café.' }];
  const rated = completed.filter(p => isScore(p.evaluation?.overall));
  const best = highestRated(completed);
  if (best.length) result.push({ id: `rating:${coffee.id}`, text: `Entre ${rated.length} preparos avaliados, a maior nota registrada foi ${rated.find(p => p.id === best[0])!.evaluation!.overall} / 10${best.length > 1 ? `, compartilhada por ${best.length} preparos` : ''}.`, preparationIds: rated.map(p => p.id), criterion: 'Maior nota geral válida de 0 a 10 entre pelo menos dois preparos avaliados do mesmo café. Empates são preservados.' });
  const measured = completed.filter(p => p.snapshot.recipe.dose > 0 && p.snapshot.recipe.water > 0 && Number.isFinite(p.snapshot.recipe.dose) && Number.isFinite(p.snapshot.recipe.water));
  const ratios = new Set(measured.map(p => Number((p.snapshot.recipe.water / p.snapshot.recipe.dose).toFixed(4))));
  if (ratios.size > 1) result.push({ id: `ratios:${coffee.id}`, text: `Você registrou ${ratios.size} proporções diferentes com este café.`, preparationIds: measured.map(p => p.id), criterion: 'Razão água/café dos snapshots, arredondada a quatro casas para agrupar doses equivalentes.' });
  const tag = recurringSensations(completed).find(t => t.preparationIds.length >= 2);
  if (tag) result.push({ id: `tag:${coffee.id}`, text: `A sensação “${tag.name}” apareceu em ${tag.preparationIds.length} avaliações deste café.`, preparationIds: tag.preparationIds, criterion: 'Tags informadas na avaliação de cada preparo; repetições na mesma avaliação contam uma vez. Frequência não significa preferência.' });
  const methodIds = [...new Set(completed.map(p => p.snapshot.method?.id).filter(Boolean))].sort();
  for (const id of methodIds) {
    const records = completed.filter(p => p.snapshot.method?.id === id && Number.isFinite(p.elapsedMs) && p.elapsedMs >= 0);
    if (new Set(records.map(p => p.elapsedMs)).size > 1) {
      result.push({ id: `times:${coffee.id}:${id}`, text: `Os ${records.length} preparos com ${records[0].snapshot.method.name} registraram tempos acompanhados diferentes.`, preparationIds: records.map(p => p.id), criterion: 'Tempos efetivamente acompanhados no aplicativo para o mesmo café e método; não se deduz a causa da diferença.' });
      break;
    }
  }
  return result;
}
export function configurationHypothesis(preparations: Preparation[]) {
  const best = highestRated(preparations);
  if (best.length !== 1) return undefined;
  const p = preparations.find(p => p.id === best[0])!;
  const rated = preparations.filter(p => isScore(p.evaluation?.overall));
  return {
    id: `hypothesis:${p.id}`, best: p, evaluated: rated.length, considered: preparations.length,
    preparationIds: preparations.map(p => p.id),
    parameters: [p.snapshot.method?.name, p.snapshot.technique?.name, `Proporção ${ratio(p.snapshot.recipe.dose, p.snapshot.recipe.water)}`, p.snapshot.recipe.grind && `Moagem ${p.snapshot.recipe.grind}`, p.snapshot.recipe.grinder && `Moedor ${p.snapshot.recipe.grinder}`, p.snapshot.recipe.temperature !== undefined && `Temperatura ${p.snapshot.recipe.temperature} °C`].filter(Boolean).join(' · '),
    text: `Entre ${rated.length} preparos avaliados deste café, este recebeu a maior nota: ${p.evaluation!.overall} / 10. Você pode revisitar o registro e repetir um experimento para observar se o resultado se mantém.`,
    criterion: 'Pelo menos dois preparos concluídos e avaliados do mesmo café, notas válidas de 0 a 10 e uma maior nota sem empate.',
    limitation: 'É uma associação observada, sem conclusão de causa e efeito. Método, técnica, equipamentos e outras condições podem variar juntos; escalas de moagem não são convertidas.',
  };
}
/** Descriptive groups only; the threshold and per-field sample sizes are shown in the UI. */
export function profileAssociations(preparations: Preparation[]) {
  const rated = preparations.filter(p => p.state === 'completed' && isScore(p.evaluation?.overall));
  const upper = rated.filter(p => p.evaluation!.overall! >= 8);
  const other = rated.filter(p => p.evaluation!.overall! < 8);
  const otherProfile = sensoryProfile(other);
  return sensoryProfile(upper).flatMap(high => {
    const lower = otherProfile.find(row => row.key === high.key)!;
    if (high.count < 3 || lower.count < 3 || Math.round(high.value! * 100) === Math.round(lower.value! * 100)) return [];
    return [{ label: high.label, upper: high, other: lower, preparationIds: [...high.preparationIds, ...lower.preparationIds] }];
  });
}
export interface KnowledgeFilters { category?: string; coffeeId?: string; from?: string; to?: string }
export function associatedReflectionCoffee(data: CollectionData, reflection: Reflection) {
  const a = reflection.association;
  return a?.kind === 'coffee' ? a.id : a?.kind === 'preparation' ? data.preparations.find(p => p.id === a.id)?.snapshot.coffee?.id : undefined;
}
export function knowledgeReflections(data: CollectionData, filters: KnowledgeFilters = {}) {
  return data.reflections.filter(r => (!filters.category || r.category === filters.category)
    && (!filters.coffeeId || associatedReflectionCoffee(data, r) === filters.coffeeId)
    && (!filters.from || r.occurredOn >= filters.from) && (!filters.to || r.occurredOn <= filters.to))
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
export const experienceDay = (p: Preparation) => localDay(new Date(p.finishedAt));

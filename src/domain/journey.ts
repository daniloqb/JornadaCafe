import type { CollectionData, Entity } from './collection';
import type { Preparation } from './preparation';

export const sensoryFields = { acidity: 'Acidez', sweetness: 'Doçura', body: 'Corpo', intensity: 'Intensidade' } as const;
export interface PreparationEvaluation {
  overall?: number; acidity?: number; sweetness?: number; body?: number; intensity?: number;
  tags: string[]; createdAt: string; updatedAt: string;
}
export interface Reflection extends Entity {
  occurredOn: string; title?: string; text: string; category?: string;
  association?: { kind: 'coffee' | 'preparation'; id: string };
  featured?: boolean;
}
export type JourneyMutation = { type: 'reflection'; value: Reflection } | { type: 'deleteReflection'; id: string }
  | { type: 'evaluatePreparation'; id: string; value: PreparationEvaluation };
export function validDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const journeyDate = (date: string) => new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export function applyJourneyMutation(data: CollectionData, mutation: { type: string }): CollectionData | undefined {
  if (!['reflection', 'deleteReflection', 'evaluatePreparation'].includes(mutation.type)) return;
  const action = mutation as JourneyMutation;
  if (action.type === 'deleteReflection') return { ...data, reflections: data.reflections.filter(r => r.id !== action.id) };
  const now = new Date().toISOString();
  if (action.type === 'evaluatePreparation') {
    const p = data.preparations.find(p => p.id === action.id);
    if (!p || p.state !== 'completed') throw new Error('Selecione um preparo concluído disponível.');
    const value = action.value;
    for (const n of [value.overall, ...Object.keys(sensoryFields).map(key => value[key as keyof typeof sensoryFields])]) {
      if (n !== undefined && (!Number.isInteger(n) || n < 0 || n > 10)) throw new Error('Use notas inteiras entre 0 e 10 ou deixe sem informação.');
    }
    const tags = [...new Set(value.tags.map(t => t.trim()).filter(Boolean))];
    if (tags.some(t => t.length > 100) || tags.length > 30) throw new Error('Use até 30 percepções com até 100 caracteres cada.');
    return { ...data, preparations: data.preparations.map(item => item.id === p.id ? { ...item, updatedAt: now, evaluation: { ...value, tags, createdAt: p.evaluation?.createdAt ?? now, updatedAt: now } } : item) };
  }
  const old = data.reflections.find(r => r.id === action.value.id);
  const value = { ...action.value };
  if (!value.id || !Number.isFinite(Date.parse(value.createdAt)) || !validDay(value.occurredOn)) throw new Error('Informe uma data válida para a reflexão.');
  if (!value.text.trim()) throw new Error('Escreva o texto da reflexão.');
  if ((value.title?.length ?? 0) > 200 || (value.category?.length ?? 0) > 100) throw new Error('Revise o tamanho do título ou da categoria.');
  // A missing historical association is retained on edit. New links must exist.
  if (value.association && JSON.stringify(value.association) !== JSON.stringify(old?.association)) {
    const { kind, id } = value.association;
    if (!(kind === 'coffee' ? data.coffees : kind === 'preparation' ? data.preparations : []).some(item => item.id === id)) throw new Error('A associação selecionada não está disponível.');
  }
  value.createdAt = old?.createdAt ?? value.createdAt;
  value.updatedAt = now;
  const reflections = data.reflections.filter(r => r.id !== value.id).map(r => value.featured && r.featured ? { ...r, featured: false, updatedAt: now } : r);
  reflections.push(value);
  return { ...data, reflections };
}

const chronological = (a: Preparation, b: Preparation) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt) || a.id.localeCompare(b.id);
export function journeySummary(data: CollectionData) {
  const completed = data.preparations.filter(p => p.state === 'completed').sort(chronological);
  const methods = new Map<string, { id: string; name: string; count: number }>();
  const coffees = new Set<string>(); const techniques = new Set<string>();
  for (const p of completed) {
    if (p.snapshot.coffee?.id) coffees.add(p.snapshot.coffee.id);
    if (p.snapshot.technique?.id) techniques.add(p.snapshot.technique.id);
    const m = p.snapshot.method;
    if (m?.id) methods.set(m.id, { id: m.id, name: m.name, count: (methods.get(m.id)?.count ?? 0) + 1 });
  }
  const identified = [...methods.values()].reduce((n, m) => n + m.count, 0);
  return { completed, coffees: coffees.size, techniques: techniques.size, identified,
    methods: [...methods.values()].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).map(m => ({ ...m, percent: m.count / identified * 100 })),
    withoutMethod: completed.length - identified };
}
export function journeyNarrative(data: CollectionData) {
  const s = journeySummary(data);
  if (!s.completed.length) return 'Sua história pode começar com um preparo ou com uma reflexão. Este espaço reúne o que você registrar, no seu tempo.';
  const first = `Seu primeiro preparo concluído foi em ${journeyDate(s.completed[0].finishedAt)}.`;
  const variety = `Desde então, você preparou ${s.coffees} ${s.coffees === 1 ? 'café diferente' : 'cafés diferentes'} e utilizou ${s.methods.length} ${s.methods.length === 1 ? 'método' : 'métodos'}.`;
  const most = s.methods[0];
  const frequent = most ? ` ${most.name} aparece em ${most.count} ${most.count === 1 ? 'preparo' : 'preparos'}${s.methods[1]?.count === most.count ? ', entre os métodos mais utilizados' : ', sendo o método mais utilizado'}.` : '';
  return `${first} ${variety}${frequent}`;
}
export type RatingPeriod = 'all' | 'year' | 'month';
export function evaluationSeries(data: CollectionData, period: RatingPeriod, now = new Date()) {
  const day = localDay(now);
  const evaluated = journeySummary(data).completed.filter(p => p.evaluation && (period === 'all' || localDay(new Date(p.finishedAt)).startsWith(day.slice(0, period === 'year' ? 4 : 7))));
  return { evaluated: evaluated.length,
    ratings: evaluated.filter(p => p.evaluation!.overall !== undefined).map(p => ({ id: p.id, at: p.finishedAt, value: p.evaluation!.overall! })),
    characteristics: evaluated.map(p => ({ id: p.id, at: p.finishedAt, value: Object.keys(sensoryFields).filter(k => p.evaluation![k as keyof typeof sensoryFields] !== undefined).length })) };
}
export function journeyTags(data: CollectionData) {
  const tags = new Map<string, { name: string; preparationIds: string[] }>();
  for (const p of journeySummary(data).completed) for (const tag of new Set(p.evaluation?.tags ?? [])) {
    const key = tag.normalize('NFC').toLocaleLowerCase('pt-BR');
    const item = tags.get(key) ?? { name: tag, preparationIds: [] };
    if (!item.preparationIds.includes(p.id)) item.preparationIds.push(p.id);
    tags.set(key, item);
  }
  return [...tags.values()].sort((a, b) => b.preparationIds.length - a.preparationIds.length || a.name.localeCompare(b.name, 'pt-BR'));
}
export type TimelineItem = { id: string; at: string; kind: 'preparation'; preparation: Preparation; milestones: string[] }
  | { id: string; at: string; kind: 'reflection'; reflection: Reflection };
export function journeyTimeline(data: CollectionData): TimelineItem[] {
  const seenMethods = new Set<string>(); const seenCoffees = new Set<string>();
  const preparations: TimelineItem[] = journeySummary(data).completed.map((p, i) => {
    const milestones: string[] = [];
    if (!i) milestones.push('Primeiro preparo concluído');
    const m = p.snapshot.method; const c = p.snapshot.coffee;
    if (m?.id && !seenMethods.has(m.id)) { seenMethods.add(m.id); milestones.push(`Primeiro preparo com ${m.name}`); }
    if (c?.id && !seenCoffees.has(c.id)) { seenCoffees.add(c.id); milestones.push(`Primeiro preparo de ${c.name}`); }
    return { id: `preparation:${p.id}`, at: p.finishedAt, kind: 'preparation', preparation: p, milestones };
  });
  const reflections: TimelineItem[] = data.reflections.map(r => ({ id: `reflection:${r.id}`, at: `${r.occurredOn}T12:00:00`, kind: 'reflection', reflection: r }));
  return [...preparations, ...reflections].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}

/** Calendar-month means, omitting months with no observations instead of inventing zeroes. */
export function monthlyEvaluations(points: { id: string; at: string; value: number }[]) {
  const months = new Map<string, { month: string; sum: number; count: number }>();
  for (const p of points) {
    const month = localDay(new Date(p.at)).slice(0, 7);
    const group = months.get(month) ?? { month, sum: 0, count: 0 };
    group.sum += p.value; group.count++;
    months.set(month, group);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ month: m.month, value: m.sum / m.count, count: m.count }));
}

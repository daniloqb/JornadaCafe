import type { Preparation } from '../../domain/preparation';
import { isScore } from '../../domain/discoveries';

export type HistoryOrder = 'recent' | 'oldest';
export type HistoryPeriod = 'all' | '7' | '30' | '90' | 'custom';
export interface HistoryFilters { period: HistoryPeriod; methodId: string; coffeeId: string; from: string; to: string }
export const emptyHistoryFilters: HistoryFilters = { period: 'all', methodId: '', coffeeId: '', from: '', to: '' };

/** Calendar days in the same local timezone used to display the experience. */
export function historyDay(at: string) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function historyBounds(filters: HistoryFilters, now = new Date()) {
  if (filters.period === 'custom') return { from: filters.from, to: filters.to };
  if (filters.period === 'all') return { from: '', to: '' };
  const start = new Date(now); start.setDate(start.getDate() - Number(filters.period) + 1);
  return { from: historyDay(start.toISOString()), to: historyDay(now.toISOString()) };
}
export function historyRows(preparations: Preparation[], filters: HistoryFilters, order: HistoryOrder, now = new Date()) {
  const { from, to } = historyBounds(filters, now);
  return preparations.filter(p => {
    const day = historyDay(p.startedAt);
    return (!filters.methodId || p.snapshot.method?.id === filters.methodId)
      && (!filters.coffeeId || p.snapshot.coffee?.id === filters.coffeeId)
      && (!(from || to) || (!!day && (!from || day >= from) && (!to || day <= to)));
  }).sort((a,b) => {
    const delta = Date.parse(a.startedAt) - Date.parse(b.startedAt);
    return (order === 'recent' ? -delta : delta) || a.id.localeCompare(b.id);
  });
}
/** Options come from historical identities, even when their source was removed. */
export function historyOptions(preparations: Preparation[], kind: 'method' | 'coffee') {
  const options = new Map<string, string>();
  for (const p of [...preparations].sort((a,b) => b.startedAt.localeCompare(a.startedAt))) {
    const value = p.snapshot[kind];
    if (value?.id && !options.has(value.id)) options.set(value.id, value.name || 'Nome não informado');
  }
  return [...options].map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
}
export function preparationScore(preparation: Preparation) {
  const score = preparation.evaluation?.overall;
  return isScore(score) ? score : undefined;
}

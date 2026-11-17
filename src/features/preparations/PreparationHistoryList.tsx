import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Bean, CalendarDays, ChevronDown, ChevronRight, Coffee, History } from 'lucide-react';
import { CollectionHeading } from '../coffees/CollectionHeading';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { ActionLink, Button, EmptyState } from '../../components/ui';
import { Field } from '../../components/forms';
import type { Preparation } from '../../domain/preparation';
import { emptyHistoryFilters, historyOptions, historyRows, preparationScore, type HistoryFilters, type HistoryOrder, type HistoryPeriod } from './history-view';

const dateLabel = (at: string) => new Date(at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
const PAGE_SIZE = 24;

export interface HistoryView { filters: HistoryFilters; order: HistoryOrder; limit: number }
export const initialHistoryView: HistoryView = { filters: emptyHistoryFilters, order: 'recent', limit: PAGE_SIZE };

export function PreparationHistoryList({ preparations, view, onChange }: { preparations: Preparation[]; view: HistoryView; onChange: Dispatch<SetStateAction<HistoryView>> }) {
  const { filters, order, limit } = view;
  const methods = useMemo(() => historyOptions(preparations, 'method'), [preparations]);
  const coffees = useMemo(() => historyOptions(preparations, 'coffee'), [preparations]);
  const rows = useMemo(() => historyRows(preparations, filters, order), [preparations, filters, order]);
  const filtered = filters.period !== 'all' || !!filters.methodId || !!filters.coffeeId;
  function choose(next: Partial<HistoryFilters>) { onChange(previous => ({ ...previous, filters: { ...previous.filters, ...next }, limit: PAGE_SIZE })); }
  function clear() { onChange(previous => ({ ...previous, filters: emptyHistoryFilters, limit: PAGE_SIZE })); }
  return <div className="preparation-history-page editorial-page">
    <CollectionHeading className="history-editorial-heading" image="preparations-hero" label="Histórico de Preparações" title="Minhas Preparações" description="O registro das experiências que realizei, com suas receitas, avaliações e descobertas." back="#/preparar" historyBack />
    <section className="history-paper editorial-paper" aria-label="Preparações registradas">
      <div className="history-filters" role="group" aria-label="Filtrar preparações">
        <label className="history-filter"><CalendarDays size={21} aria-hidden="true" /><span className="sr-only">Período</span><select aria-label="Período" value={filters.period} onChange={e => choose({ period: e.target.value as HistoryPeriod })}><option value="all" label="Período">Todos os períodos</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="custom">Personalizado</option></select><ChevronDown size={17} aria-hidden="true" /></label>
        <label className="history-filter"><Coffee size={21} aria-hidden="true" /><span className="sr-only">Método</span><select aria-label="Método" value={filters.methodId} onChange={e => choose({ methodId: e.target.value })}><option value="" label="Método">Todos os métodos</option>{methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></label>
        <label className="history-filter"><Bean size={21} aria-hidden="true" /><span className="sr-only">Café</span><select aria-label="Café" value={filters.coffeeId} onChange={e => choose({ coffeeId: e.target.value })}><option value="" label="Café">Todos os cafés</option>{coffees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></label>
      </div>
      {filters.period === 'custom' && <div className="history-dates"><Field label="Desde" type="date" name="from" value={filters.from} max={filters.to || undefined} onChange={e => choose({ from: e.target.value })} /><Field label="Até" type="date" name="to" value={filters.to} min={filters.from || undefined} onChange={e => choose({ to: e.target.value })} /></div>}
      {filtered && <Button className="history-clear" variant="secondary" onClick={clear}>Limpar filtros</Button>}
      <div className="history-list-heading"><p className="history-count" role="status" aria-live="polite">{rows.length} {rows.length === 1 ? 'preparação' : 'preparações'}</p><label className="history-order"><span className="sr-only">Ordenar preparações</span><select aria-label="Ordenar preparações" value={order} onChange={e => { const value = e.target.value as HistoryOrder; onChange(previous => ({ ...previous, order: value, limit: PAGE_SIZE })); }}><option value="recent">Mais recentes</option><option value="oldest">Mais antigas</option></select><ChevronDown size={18} aria-hidden="true" /></label></div>
      {rows.length ? <><ul className="preparation-experience-list">{rows.slice(0, limit).map(p => {
        const s = p.snapshot; const score = preparationScore(p); const name = s.coffee?.name || 'Sem café associado';
        return <li key={p.id}><a className="card preparation-experience" href={`#/preparar/historico/${p.id}`}>
          <div className="preparation-experience-photo"><CoffeePhoto id={s.coffee?.photoId} name={name} subject="Café" /></div>
          <div className="preparation-experience-copy"><h2>{name}</h2><p className="preparation-experience-description">{s.method?.name || 'Método não informado'} · {s.recipe?.name || s.technique?.name || 'Receita não informada'}</p><div className="preparation-experience-meta"><time dateTime={p.startedAt}><CalendarDays size={18} aria-hidden="true" />{dateLabel(p.startedAt)}</time>{score !== undefined && <span className="preparation-score" aria-label={`Avaliação do preparo: ${score} de 10`}>{score}/10</span>}</div><span className={`preparation-experience-state${p.state === 'interrupted' ? ' is-interrupted' : ''}`}>{p.state === 'completed' ? 'Concluído' : 'Interrompido'}</span></div>
          <ChevronRight className="preparation-experience-arrow" size={24} aria-hidden="true" />
        </a></li>;
      })}</ul>{limit < rows.length && <Button className="history-load-more" variant="secondary" onClick={() => onChange(previous => ({ ...previous, limit: previous.limit + PAGE_SIZE }))}>Mostrar mais preparações ({Math.min(limit, rows.length)} de {rows.length})</Button>}</> : <div className="history-empty"><EmptyState icon={History} title={preparations.length ? 'Nenhum preparo com esses filtros' : 'Suas experiências começam com o primeiro preparo.'}>{preparations.length ? 'Escolha outro período, método ou café para reencontrar uma experiência.' : 'Escolha uma receita, acompanhe o preparo e guarde esse momento da sua jornada.'}</EmptyState>{preparations.length ? <Button variant="secondary" onClick={clear}>Limpar filtros</Button> : <ActionLink href="#/preparar">Explorar receitas</ActionLink>}</div>}
    </section>
  </div>;
}

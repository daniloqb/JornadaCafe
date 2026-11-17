import { useState } from 'react';
import { ArrowRight, BookOpen, Info, Lightbulb } from 'lucide-react';
import type { Preparation } from '../../domain/preparation';
import { configurationHypothesis, isScore } from '../../domain/discoveries';
import { journeyDate } from '../../domain/journey';
import { ActionLink, Card } from '../../components/ui';
import { formatNumber, secondsLabel } from '../../domain/brewing';

export const scoreLabel = (value: unknown) => isScore(value) ? `${formatNumber(value)} / 10` : 'Não registrada';
export const timeLabel = (value: number) => Number.isFinite(value) && value >= 0 ? secondsLabel(Math.floor(value / 1000)) : 'Não informado';
export function Evidence({ preparations, label = 'Ver preparos considerados' }: { preparations: Preparation[]; label?: string }) {
  const [open, setOpen] = useState(false); const [limit, setLimit] = useState(15);
  return <details className="discovery-evidence" onToggle={e => setOpen(e.currentTarget.open)}><summary>{label} ({preparations.length})</summary>{open && <><ul>{preparations.slice(0, limit).map(p => <li key={p.id}><a href={`#/preparar/historico/${p.id}`}><span>{journeyDate(p.finishedAt)} · {p.snapshot.recipe.name}</span><small>{p.snapshot.method?.name || 'Método não informado'} · Nota: {scoreLabel(p.evaluation?.overall)}</small><ArrowRight size={16} aria-hidden="true" /></a></li>)}</ul>{preparations.length > limit && <button className="button button--secondary" onClick={() => setLimit(n => n + 15)}>Mostrar mais registros</button>}</>}</details>;
}
export const comparisonUrl = (coffeeId: string, preparations: Preparation[]) => `#/descobertas/comparar?cafe=${encodeURIComponent(coffeeId)}&preparos=${preparations.slice(0, 3).map(p => encodeURIComponent(p.id)).join(',')}`;
export function HypothesisCard({ preparations }: { preparations: Preparation[] }) {
  const hypothesis = configurationHypothesis(preparations);
  if (!hypothesis) return null;
  return <Card className="discovery-hypothesis"><div className="discovery-card-heading"><span className="discovery-icon discovery-icon--terra"><Lightbulb size={29} aria-hidden="true" /></span><div><span className="eyebrow">HIPÓTESE PARA EXPLORAR</span><h3>Uma descoberta possível</h3><p>{hypothesis.text}</p></div></div><p className="discovery-parameters">{hypothesis.best.snapshot.coffee?.name} · {hypothesis.parameters}</p><div className="discovery-caution"><Info size={21} aria-hidden="true" /><p>{hypothesis.limitation}</p></div><details className="discovery-rule"><summary>Como esta hipótese foi selecionada</summary><p>{hypothesis.criterion}</p><p>{hypothesis.evaluated} de {hypothesis.considered} preparos considerados têm nota geral válida.</p></details><Evidence preparations={preparations} /><div className="discovery-actions"><ActionLink variant="secondary" href={`#/preparar/historico/${hypothesis.best.id}`} arrow={false}><BookOpen size={18} aria-hidden="true" />Ver preparo</ActionLink><ActionLink href={comparisonUrl(hypothesis.best.snapshot.coffee!.id, [hypothesis.best, ...preparations.filter(p => p.id !== hypothesis.best.id)])}>Comparar evidências</ActionLink></div></Card>;
}

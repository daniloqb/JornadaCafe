import { useMemo, useState } from 'react';
import { Check, Filter, Info, Pencil, Scale, Star } from 'lucide-react';
import type { CollectionData } from '../../domain/collection';
import { grams } from '../../domain/collection';
import { coffeeExperiences, comparisonPreparations, highestRated } from '../../domain/discoveries';
import { formatNumber, ratio } from '../../domain/brewing';
import type { Preparation } from '../../domain/preparation';
import { journeyDate } from '../../domain/journey';
import { ActionLink, Button, Card, EmptyState } from '../../components/ui';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { HypothesisCard, scoreLabel, timeLabel } from './shared';

export function comparisonRows(p: Preparation) {
  const r = p.snapshot.recipe;
  return [
    ['Método', p.snapshot.method?.name || 'Não informado'], ['Técnica', p.snapshot.technique?.name || 'Não informada'], ['Receita e versão', `${r.name} · versão ${r.version}`],
    ['Dose de café', Number.isFinite(r.dose) ? grams(r.dose) : 'Não informada'], ['Água', Number.isFinite(r.water) ? grams(r.water) : 'Não informada'], ['Proporção', ratio(r.dose, r.water)],
    ['Moagem (valor original)', r.grind || 'Não informada'], ['Moedor / escala', r.grinder || 'Referência do moedor não informada'], ['Temperatura', r.temperature !== undefined && Number.isFinite(r.temperature) ? `${formatNumber(r.temperature)} °C` : 'Não informada'],
    ['Tempo efetivo acompanhado', timeLabel(p.elapsedMs)], ['Avaliação geral', scoreLabel(p.evaluation?.overall)], ['Acidez', scoreLabel(p.evaluation?.acidity)], ['Doçura', scoreLabel(p.evaluation?.sweetness)], ['Corpo', scoreLabel(p.evaluation?.body)], ['Intensidade', scoreLabel(p.evaluation?.intensity)],
    ['Sensações registradas', [...new Set(p.evaluation?.tags ?? [])].join(' · ') || 'Não registradas'], ['Observações do preparo', p.notes || 'Não registradas'], ['Instruções da receita histórica', r.notes || 'Não registradas'],
  ];
}
export function ExperienceComparison({ data, query }: { data: CollectionData; query: URLSearchParams }) {
  const groups = useMemo(() => coffeeExperiences(data), [data]);
  const [coffeeId, setCoffeeId] = useState(() => groups.find(g => g.id === query.get('cafe'))?.id ?? groups[0]?.id ?? '');
  const group = groups.find(g => g.id === coffeeId);
  const [ids, setIds] = useState<string[]>(() => {
    const requested = query.get('preparos')?.split(',');
    return requested ? [...new Set(requested)].filter(id => group?.preparations.some(p => p.id === id)).slice(0, 3) : group?.preparations.slice(0, 3).map(p => p.id) ?? [];
  });
  const [selecting, setSelecting] = useState(false); const [view, setView] = useState('auto'); const [selectionLimit, setSelectionLimit] = useState(12);
  const selected = useMemo(() => { const available = ids.filter(id => group?.preparations.some(p => p.id === id)); return available.length >= 2 ? comparisonPreparations(data, coffeeId, available) : []; }, [data, coffeeId, ids, group]);
  const highest = useMemo(() => highestRated(selected), [selected]);
  if (!groups.length) return <div className="discovery-content"><Card className="discovery-panel"><EmptyState icon={Scale} title="Suas comparações começam com dois preparos">Conclua preparos associados ao mesmo café. Eles poderão ser comparados mesmo sem avaliação.</EmptyState><ActionLink href="#/preparar">Preparar um café</ActionLink></Card></div>;
  const ready = selected.length >= 2;
  return <div className="discovery-content"><div className="discovery-context"><Info size={26} aria-hidden="true" /><p>A comparação ajuda a formular hipóteses, sem afirmar causa e efeito.</p></div>
    <label className="form-field discovery-coffee-select"><span>Escolher café com preparos concluídos</span><select value={coffeeId} onChange={e => { setCoffeeId(e.target.value); setIds([]); setSelecting(true); setSelectionLimit(12); }}>{groups.map(g => <option key={g.id} value={g.id}>{g.name} · {g.preparations.length} preparos</option>)}</select></label>
    {group && <><Card className="discovery-coffee-card"><CoffeePhoto id={group.photoId} name={group.name} /><div><h3>{group.name}</h3><p>{group.preparations.length} preparos concluídos disponíveis</p>{group.exists ? <a className="text-link" href={`#/cafes/${group.id}`}>Abrir café</a> : <small>Café removido da coleção; snapshots históricos preservados.</small>}</div></Card>
      <div className="discovery-section-heading"><h2>Experiências selecionadas ({ids.length})</h2><Button variant="secondary" onClick={() => setSelecting(value => !value)} aria-expanded={selecting}><Pencil size={17} aria-hidden="true" />{selecting ? 'Recolher seleção' : 'Editar seleção'}</Button></div>
      <details className="discovery-selection" open={selecting || !ready} onToggle={e => { if (ready) setSelecting(e.currentTarget.open); }}><summary>Selecionar de dois a três preparos</summary><p>Escolha as xícaras que deseja colocar lado a lado. As avaliações são opcionais.</p><fieldset><legend className="sr-only">Preparos disponíveis de {group.name}</legend>{group.preparations.slice(0, selectionLimit).map(p => <label key={p.id} className="discovery-preparation-choice"><input type="checkbox" checked={ids.includes(p.id)} disabled={!ids.includes(p.id) && ids.length >= 3} onChange={e => setIds(current => e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id))} /><span><strong>{journeyDate(p.finishedAt)} · {p.snapshot.recipe.name}</strong><small>{p.snapshot.method?.name || 'Método não informado'} · versão {p.snapshot.recipe.version} · {grams(p.snapshot.recipe.dose)} / {grams(p.snapshot.recipe.water)} · {timeLabel(p.elapsedMs)} · Nota: {scoreLabel(p.evaluation?.overall)}</small></span></label>)}</fieldset>{group.preparations.length > selectionLimit && <Button variant="secondary" onClick={() => setSelectionLimit(n => n + 12)}>Mostrar mais preparos</Button>}{ids.length >= 3 && <p className="field-hint">Limite de três preparos. Desmarque um para escolher outro.</p>}</details>
      {ready ? <><div className="comparison-view" role="group" aria-label="Disposição da comparação">{[['auto', 'Adaptar à tela'], ['table', 'Tabela'], ['cards', 'Cartões']].map(([key, name]) => <Button key={key} variant="secondary" aria-pressed={view === key} onClick={() => setView(key)}>{name}</Button>)}</div><div className={`comparison-result comparison-result--${view}`}>
        <div className="comparison-table-wrap" tabIndex={0} role="region" aria-label="Tabela comparativa dos preparos; role horizontalmente se necessário"><table className="comparison-table"><caption>Parâmetros dos snapshots históricos. Notas ausentes permanecem sem avaliação.</caption><thead><tr><th scope="col">O que foi registrado</th>{selected.map((p, i) => <th scope="col" key={p.id}><span className="comparison-letter">Preparo {String.fromCharCode(65 + i)} <Check size={18} aria-hidden="true" /></span><time dateTime={p.finishedAt}>{journeyDate(p.finishedAt)}</time><span className="comparison-score"><Star size={18} aria-hidden="true" />{scoreLabel(p.evaluation?.overall)}</span>{highest.includes(p.id) && <span className="comparison-best">{highest.length > 1 ? 'Maior nota · empate' : 'Maior nota observada'}</span>}<a href={`#/preparar/historico/${p.id}`}>Ver preparo original →</a></th>)}</tr></thead><tbody>{comparisonRows(selected[0]).map(([label], row) => <tr key={label}><th scope="row">{label}</th>{selected.map(p => <td key={p.id}>{comparisonRows(p)[row][1]}</td>)}</tr>)}</tbody></table></div>
        <div className="comparison-cards">{selected.map((p, i) => <Card key={p.id} className="comparison-card"><header><h3>Preparo {String.fromCharCode(65 + i)}</h3><time dateTime={p.finishedAt}>{journeyDate(p.finishedAt)}</time><strong>{scoreLabel(p.evaluation?.overall)}</strong>{highest.includes(p.id) && <span className="comparison-best">{highest.length > 1 ? 'Maior nota · empate' : 'Maior nota observada'}</span>}</header><dl>{comparisonRows(p).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><ActionLink variant="secondary" href={`#/preparar/historico/${p.id}`}>Ver preparo original</ActionLink></Card>)}</div>
      </div><p className="discovery-caution"><Info size={21} aria-hidden="true" />Os valores de moagem são preservados com sua referência original. Escalas e moedores diferentes não são convertidos nem ordenados como granulometria.</p><HypothesisCard preparations={selected} /></> : <EmptyState icon={Filter} title={group.preparations.length < 2 ? 'Este café ainda precisa de outro preparo' : 'Escolha pelo menos duas experiências'}>Selecione de dois a três preparos concluídos deste mesmo café. Preparos sem nota também podem participar.</EmptyState>}
    </>}
  </div>;
}

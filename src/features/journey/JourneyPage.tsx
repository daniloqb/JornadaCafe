import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bean, BookOpen, CalendarDays, ChevronRight, Coffee, Feather, Filter, Leaf, Quote, Route, Sprout, Star, TrendingUp } from 'lucide-react';
import { ActionLink, Button, Card, EmptyState, LoadingIndicator, BackLink } from '../../components/ui';
import { Dialog, FormError, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { evaluationSeries, journeyDate, journeyNarrative, journeySummary, journeyTags, journeyTimeline, monthlyEvaluations, type RatingPeriod, type Reflection } from '../../domain/journey';
import { ReflectionForm } from './ReflectionForm';
import type { CollectionData } from '../../domain/collection';

const sections = [['caminho', 'Meu caminho', Coffee], ['evolucao', 'Minha evolução', TrendingUp], ['tempo', 'Linha do tempo', CalendarDays], ['diario', 'Meu diário', BookOpen]] as const;
function Association({ reflection: r, data }: { reflection: Reflection; data: CollectionData }) {
  const a = r.association;
  if (!a) return null;
  const found = a.kind === 'coffee' ? data.coffees.find(c => c.id === a.id) : data.preparations.find(p => p.id === a.id);
  return found ? <a className="text-link" href={a.kind === 'coffee' ? `#/cafes/${a.id}` : `#/preparar/historico/${a.id}`}>Abrir {a.kind === 'coffee' ? 'café' : 'preparo'} associado <ArrowRight size={15} aria-hidden="true" /></a> : <p className="field-hint">Registro associado indisponível. Sua reflexão permanece preservada.</p>;
}
function SeriesChart({ points, maximum, label, tone = 'terracotta' }: { points: { id: string; at: string; value: number }[]; maximum: number; label: string; tone?: 'terracotta' | 'olive' }) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(600);
  const hasPoints = points.length > 0;
  useLayoutEffect(() => {
    const svg = chartRef.current;
    if (!svg) return;
    const measure = () => setWidth(Math.max(260, svg.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [hasPoints]);
  if (!points.length) return <p className="journey-empty">Ainda não há registros para este gráfico no período.</p>;
  const months = monthlyEvaluations(points);
  const ordinal = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
  const first = ordinal(months[0].month); const last = ordinal(months[months.length - 1].month);
  const x = (month: string) => last === first ? width / 2 : 42 + (ordinal(month) - first) / (last - first) * (width - 78);
  const y = (value: number) => 162 - value / maximum * 120;
  const valueLabel = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const recent = months[months.length - 1];
  return <><svg className={`journey-chart journey-chart--${tone}`} ref={chartRef} viewBox={`0 0 ${width} 205`} role="img" aria-label={`${label}. Médias mensais de ${points.length} registros; escala de 0 a ${maximum}. Valores individuais na tabela abaixo.`}>
    {Array.from({ length: maximum === 10 ? 6 : 5 }, (_, i) => maximum === 10 ? i * 2 : i).map(n => <g key={n}><line x1="35" x2={width - 20} y1={y(n)} y2={y(n)} className="chart-grid" /><text x="29" y={y(n) + 6} textAnchor="end">{n}</text></g>)}
    {months.map((m, i) => {
      const previous = months[i - 1];
      // Only consecutive recorded months are joined. Missing months remain gaps.
      const joined = previous && ordinal(m.month) - ordinal(previous.month) === 1;
      return <g key={m.month}>
        {joined && <><path d={`M ${x(previous.month)} 162 L ${x(previous.month)} ${y(previous.value)} L ${x(m.month)} ${y(m.value)} L ${x(m.month)} 162 Z`} className="chart-area" /><line x1={x(previous.month)} y1={y(previous.value)} x2={x(m.month)} y2={y(m.value)} className="chart-line" /></>}
        <circle cx={x(m.month)} cy={y(m.value)} r="4.5" className="chart-dot"><title>{m.month}: {valueLabel(m.value)} · {m.count} registros</title></circle>
        {(months.length <= (width < 430 ? 4 : 6) || i % Math.ceil((months.length - 1) / (width < 430 ? 3 : 5)) === 0 || i === months.length - 1) && <text x={x(m.month)} y="193" textAnchor="middle">{new Date(`${m.month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', ...(months[0].month.slice(0, 4) !== recent.month.slice(0, 4) ? { year: '2-digit' } : {}) }).replace('.', '')}</text>}
      </g>;
    })}
    <g className="chart-callout"><rect x={x(recent.month) - 22} y={y(recent.value) - 35} width="44" height="25" rx="10" /><text x={x(recent.month)} y={y(recent.value) - 17} textAnchor="middle">{valueLabel(recent.value)}</text></g>
  </svg><details className="chart-values"><summary>Consultar valores e preparos ({points.length})</summary><div className="chart-table"><table><caption>{label} · valores individuais usados nas médias mensais</caption><thead><tr><th>Data</th><th>Valor</th><th>Registro</th></tr></thead><tbody>{points.map(p => <tr key={p.id}><td>{new Date(p.at).toLocaleDateString('pt-BR')}</td><td>{p.value} / {maximum}</td><td><a className="inline-link" href={`#/preparar/historico/${p.id}`}>Ver preparo</a></td></tr>)}</tbody></table></div></details></>;
}
function SectionIntro({ kind, title, children }: { kind: 'evolution' | 'memories'; title: string; children: ReactNode }) {
  return <div className={`journey-intro journey-intro--${kind}`}>
    <div><span className="eyebrow">{kind === 'evolution' ? 'OBSERVAR O CAMINHO' : 'MEMÓRIAS DA MINHA JORNADA'}</span><h2>{title}</h2><p>{children}</p></div>
    <img src={kind === 'evolution' ? '/images/journey-cup.png' : '/images/journey-botanical.png'} alt="" />
  </div>;
}
export function JourneyPage({ path }: { path: string }) {
  const { data, loading, error, mutate } = useCollection();
  const section = sections.find(([key]) => key === path.split('/')[2])?.[0] ?? 'caminho';
  const [allTags, setAllTags] = useState(false);
  const [period, setPeriod] = useState<RatingPeriod>('all');
  const [filter, setFilter] = useState('all'); const [limit, setLimit] = useState(20);
  const [editor, setEditor] = useState<Reflection | 'new'>(); const [removing, setRemoving] = useState<Reflection>();
  const action = useFormAction();
  const summary = useMemo(() => journeySummary(data), [data]);
  const series = useMemo(() => evaluationSeries(data, period), [data, period]);
  const tags = useMemo(() => journeyTags(data), [data]);
  const timeline = useMemo(() => journeyTimeline(data), [data]);
  const reflections = timeline.filter(item => item.kind === 'reflection').map(item => item.reflection);
  const featured = reflections.find(r => r.featured) ?? reflections[0];
  const visible = timeline.filter(item => filter === 'all' || filter === item.kind || (filter === 'milestone' && item.kind === 'preparation' && item.milestones.length));
  const featuresAverage = series.characteristics.length ? series.characteristics.reduce((n, p) => n + p.value, 0) / series.characteristics.length : undefined;
  return <div className={`journey-page journey-page--${section}`}>
    <header className="journey-masthead">
      <BackLink href="#/inicio"><ArrowLeft size={22} aria-hidden="true" /><span className="sr-only">Voltar</span></BackLink>
      <div><Sprout size={28} strokeWidth={1.6} aria-hidden="true" /><h1 tabIndex={-1}>Minha Jornada</h1></div>

    </header>
    <nav className="journey-tabs" aria-label="Seções de Minha Jornada">{sections.map(([key, label, Icon]) => <a key={key} href={`#/jornada/${key}`} aria-current={section === key ? 'page' : undefined}><Icon size={23} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></a>)}</nav>
    {loading ? <LoadingIndicator>Reunindo suas experiências…</LoadingIndicator> : error ? <p>Seus registros estarão disponíveis após recuperar o armazenamento.</p> : <>
      {section === 'caminho' && <>
        <section className="journey-hero">
          <img src="/images/journey-ritual.png" alt="" fetchPriority="high" />
          <div><span className="eyebrow"><Sprout size={23} aria-hidden="true" /> MEU CAMINHO</span><h2>Cada xícara conta<br />uma história.</h2><span className="journey-brush" aria-hidden="true" /><p>Um caminho de experiências,<br />descobertas e aprendizados pelo café.</p></div>
        </section>
        <div className="journey-stats">{[[Coffee, summary.completed.length, 'Preparações concluídas'], [Bean, summary.coffees, 'Cafés preparados'], [Filter, summary.methods.length, 'Métodos explorados'], [Route, summary.techniques, 'Técnicas utilizadas']].map(([Icon, value, label]) => { const StatIcon = Icon as typeof Coffee; return <Card key={String(label)}><StatIcon size={28} strokeWidth={1.5} aria-hidden="true" /><strong className="type-number">{String(value)}</strong><span>{String(label)}</span></Card>; })}</div>
        <Card className="journey-story"><Sprout size={38} strokeWidth={1.6} aria-hidden="true" /><div><h2>Minha história até aqui</h2><p>{journeyNarrative(data)}</p><a className="text-link" href={summary.completed.length ? '#/jornada/tempo' : '#/preparar'}>{summary.completed.length ? 'Revisitar minhas experiências' : 'Preparar um café'}<ChevronRight size={20} aria-hidden="true" /></a></div></Card>
        <Card className="journey-continue"><h2>Continuar minha jornada</h2><div className="journey-shortcuts">{[[CalendarDays, 'Linha do tempo', 'tempo'], [Feather, 'Meu diário', 'diario'], [TrendingUp, 'Minha evolução', 'evolucao']].map(([Icon, title, key]) => { const ShortcutIcon = Icon as typeof Coffee; return <a href={`#/jornada/${key}`} key={String(key)}><ShortcutIcon size={27} strokeWidth={1.5} aria-hidden="true" /><span>{String(title)}</span><ChevronRight size={20} aria-hidden="true" /></a>; })}</div></Card>
      </>}
      {section === 'evolucao' && <>
        <SectionIntro kind="evolution" title="Minha evolução">Acompanhe as avaliações, os métodos e as percepções que fazem parte da sua história com o café.</SectionIntro>
        <div className="journey-period"><label className="form-field"><span>Período das avaliações</span><select value={period} onChange={e => setPeriod(e.target.value as RatingPeriod)}><option value="all">Todo o período</option><option value="year">Este ano</option><option value="month">Este mês</option></select></label></div>
        <div className="journey-grid"><Card className="journey-panel journey-panel--chart"><div className="journey-panel-heading"><span className="journey-panel-icon"><Star size={25} aria-hidden="true" /></span><div><h3>Avaliação geral dos preparos</h3><p>Sua satisfação com as xícaras preparadas.</p></div></div><p className="journey-chart-count">{series.ratings.length} avaliações gerais consideradas · escala de 0 a 10</p><SeriesChart points={series.ratings} maximum={10} label="Avaliação geral dos preparos" /><p className="field-hint">Cada ponto representa a média de um mês com avaliações. Preparos sem nota não entram no cálculo; meses sem registros permanecem sem valor.</p><a className="text-link" href="#/preparar/historico">Avaliar um preparo no histórico <ArrowRight size={15} aria-hidden="true" /></a></Card>
        <Card className="journey-panel journey-panel--chart journey-panel--olive"><div className="journey-panel-heading"><span className="journey-panel-icon"><Sprout size={25} aria-hidden="true" /></span><div><h3>Características registradas por preparo</h3><p>Acidez, doçura, corpo e intensidade nas suas avaliações.</p></div></div>{featuresAverage !== undefined && <p className="journey-average"><strong className="type-number">{featuresAverage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong> de 4 campos, em média · {series.evaluated} avaliações</p>}<SeriesChart points={series.characteristics} maximum={4} tone="olive" label="Quantidade de características preenchidas por avaliação" /><p className="field-hint">Cada ponto mostra a média mensal de campos preenchidos. Esse detalhamento descreve o registro, sem indicar habilidade sensorial; as tags aparecem separadamente.</p></Card>
        <Card className="journey-panel"><div className="journey-panel-heading"><span className="journey-panel-icon"><Filter size={25} aria-hidden="true" /></span><div><h3>Métodos explorados</h3><p>Métodos que você já utilizou nos seus preparos.</p></div></div><p className="field-hint">Participação em {summary.identified} preparos concluídos com método identificável.</p>{summary.methods.length ? <ul className="method-distribution">{summary.methods.map(m => <li key={m.id}><div><span>{m.name}</span><span>{m.count} {m.count === 1 ? 'preparo' : 'preparos'} · {m.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span></div><meter min={0} max={100} value={m.percent} aria-label={`${m.name}: ${m.percent.toFixed(1)}%`} /></li>)}</ul> : <p className="journey-empty">Os métodos aparecerão após seus primeiros preparos concluídos.</p>}{summary.withoutMethod > 0 && <p className="field-hint">{summary.withoutMethod} preparos sem método identificável, fora do cálculo percentual.</p>}</Card>
        <Card className="journey-panel"><div className="journey-panel-heading"><span className="journey-panel-icon"><Bean size={25} aria-hidden="true" /></span><div><h3>Percepções sensoriais</h3><p>Características mais registradas nas suas avaliações.</p></div></div>{tags.length ? <div className="journey-tags">{(allTags ? tags : tags.slice(0, 6)).map(t => <details key={t.name}><summary>{t.name} <span>· {t.preparationIds.length}</span></summary>{t.preparationIds.map(id => <a key={id} className="text-link" href={`#/preparar/historico/${id}`}>Ver preparo de {journeyDate(data.preparations.find(p => p.id === id)!.finishedAt)}</a>)}</details>)}</div> : <p className="journey-empty">Ainda não há tags sensoriais nas avaliações dos preparos.</p>}{tags.length > 6 && <Button className="journey-all-tags" variant="secondary" onClick={() => setAllTags(value => !value)}>{allTags ? 'Mostrar menos' : '+ Ver todas'}</Button>}</Card></div>
      </>}
      {section === 'tempo' && <>
        <SectionIntro kind="memories" title="Um diário de experiências com café">Preparos e reflexões que vão construindo minha relação com o café.</SectionIntro>
        {featured && <Card className="journey-memory-quote"><Quote size={35} aria-hidden="true" /><div><h3>{featured.title || 'Uma reflexão da minha jornada'}</h3><p className="reflection-excerpt">{featured.text}</p><Button variant="secondary" onClick={() => setEditor(featured)}>Ler reflexão</Button></div><Coffee size={50} strokeWidth={1.2} aria-hidden="true" /></Card>}
        <div className="journey-section-heading"><h2>Memórias da minha jornada</h2><ActionLink href="#/jornada/diario" variant="secondary" arrow={false}><BookOpen size={18} aria-hidden="true" />Meu diário</ActionLink></div>
        <label className="form-field journey-filter"><span>Mostrar acontecimentos</span><select value={filter} onChange={e => { setFilter(e.target.value); setLimit(20); }}><option value="all">Todos</option><option value="preparation">Preparos e avaliações</option><option value="milestone">Primeiros encontros</option><option value="reflection">Reflexões</option></select></label>
        {visible.length ? <><ol className="journey-timeline">{visible.slice(0, limit).map(item => <li key={item.id} className={item.kind === 'reflection' ? 'journey-event--reflection' : item.milestones.length ? 'journey-event--first' : 'journey-event--preparation'}><span className="journey-event-icon">{item.kind === 'reflection' ? <Feather size={21} aria-hidden="true" /> : item.milestones.length ? <Sprout size={21} aria-hidden="true" /> : <Coffee size={21} aria-hidden="true" />}</span><Card><time dateTime={item.at}>{journeyDate(item.at)}</time>{item.kind === 'preparation' ? <><h3>{item.preparation.snapshot.recipe.name}</h3><p>{item.preparation.snapshot.coffee?.name ?? 'Sem café associado'} · {item.preparation.snapshot.method?.name ?? 'Método não identificado'}</p>{item.preparation.evaluation && <p>{item.preparation.evaluation.overall !== undefined ? `Avaliação geral: ${item.preparation.evaluation.overall} / 10` : 'Avaliação registrada sem nota geral'} · registrada em {journeyDate(item.preparation.evaluation.createdAt)}</p>}{item.milestones.length > 0 && <ul className="journey-milestones">{item.milestones.map(m => <li key={m}><Leaf size={14} aria-hidden="true" />{m}</li>)}</ul>}<a className="text-link" href={`#/preparar/historico/${item.preparation.id}`}>Revisitar preparo <ChevronRight size={18} aria-hidden="true" /></a></> : <><h3>{item.reflection.title || 'Reflexão pessoal'}</h3><p className="reflection-excerpt">{item.reflection.text}</p>{item.reflection.category && <span className="journey-category">{item.reflection.category}</span>}<Association reflection={item.reflection} data={data} /><Button variant="secondary" onClick={() => setEditor(item.reflection)}>Ler ou editar reflexão</Button></>}</Card></li>)}</ol>{visible.length > limit && <Button variant="secondary" onClick={() => setLimit(n => n + 20)}>Mostrar mais acontecimentos ({visible.length - limit})</Button>}</> : <EmptyState icon={BookOpen} title="Há espaço para suas primeiras memórias">Registre uma reflexão ou conclua um preparo para começar sua linha do tempo.</EmptyState>}
        <Button className="journey-write-button" onClick={() => setEditor('new')}><Feather size={23} aria-hidden="true" />Registrar uma reflexão</Button>
      </>}
      {section === 'diario' && <>
        <SectionIntro kind="memories" title="Meu diário de café">O que uma nota não conta, suas palavras podem guardar.</SectionIntro>
        <div className="journey-section-heading"><p className="eyebrow">MEMÓRIAS E REFLEXÕES</p><Button onClick={() => setEditor('new')}><Feather size={18} aria-hidden="true" />Registrar uma reflexão</Button></div>
        {featured ? <><Card className="journey-featured"><Quote size={40} strokeWidth={1.3} aria-hidden="true" /><span className="eyebrow">{featured.featured ? 'REFLEXÃO EM DESTAQUE' : 'MINHA REFLEXÃO MAIS RECENTE'}</span><h3>{featured.title || 'Uma página da minha jornada'}</h3><blockquote>{featured.text}</blockquote><time dateTime={featured.occurredOn}>{journeyDate(featured.occurredOn)}</time>{featured.category && <span className="journey-category">{featured.category}</span>}<Button variant="secondary" onClick={() => setEditor(featured)}>Ler ou editar reflexão</Button></Card>
        <div className="journey-diary-list">{reflections.slice(0, limit).map(r => <Card key={r.id}><time dateTime={r.occurredOn}>{journeyDate(r.occurredOn)}</time><h3>{r.title || 'Reflexão pessoal'}</h3><p className="reflection-excerpt">{r.text}</p>{r.category && <span className="journey-category">{r.category}</span>}<Association reflection={r} data={data} /><div className="journey-card-actions"><Button variant="secondary" onClick={() => setEditor(r)}>Ler ou editar</Button><Button variant="secondary" onClick={() => { void action.run(async () => { await mutate({ type: 'reflection', value: { ...r, featured: !r.featured } }); }); }}>{r.featured ? 'Remover destaque' : 'Destacar'}</Button><Button variant="danger" onClick={() => setRemoving(r)}>Excluir</Button></div></Card>)}</div>{reflections.length > limit && <Button variant="secondary" onClick={() => setLimit(n => n + 20)}>Mostrar mais reflexões</Button>}<FormError error={!removing ? action.error : undefined} /></> : <Card className="journey-diary-empty"><EmptyState icon={Feather} title="Uma página para o que fica">Um aroma que surpreendeu, uma mudança de gosto ou um momento simples. Sua primeira reflexão pode começar por aí.</EmptyState><Button onClick={() => setEditor('new')}>Registrar uma reflexão</Button></Card>}
      </>}
    </>}
    {editor && <ReflectionForm existing={editor === 'new' ? undefined : editor} onClose={() => setEditor(undefined)} />}
    {removing && <Dialog title="Excluir reflexão?" busy={action.busy} onClose={() => setRemoving(undefined)}><p>O texto de “{removing.title || 'Reflexão pessoal'}” será removido do diário e da linha do tempo. Esta ação não pode ser desfeita.</p><FormError error={action.error} /><div className="form-actions"><Button variant="secondary" disabled={action.busy} onClick={() => setRemoving(undefined)}>Cancelar</Button><Button variant="danger" disabled={action.busy} onClick={() => { void action.run(async () => { await mutate({ type: 'deleteReflection', id: removing.id }); setRemoving(undefined); }); }}>{action.busy ? 'Excluindo…' : 'Excluir reflexão'}</Button></div></Dialog>}
  </div>;
}

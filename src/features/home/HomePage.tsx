import { ArrowRight, BookOpen, Coffee, Leaf, Sprout } from 'lucide-react';
import { ActionLink, Card, EmptyState, PageHeader } from '../../components/ui';
import { CoffeeRitual } from '../../assets/CoffeeRitual';
import { useCollection } from '../../data/CollectionContext';
import { inventory, shelfCoffees } from '../../domain/collection';
import { journeyDate, journeyTimeline } from '../../domain/journey';
import { CoffeeCard } from '../coffees/CoffeeCard';

export function HomePage() {
  const { data, loading, error } = useCollection();
  const recent = journeyTimeline(data).slice(0, 3);
  const stocked = data.coffees.filter(c => inventory(data, c.id).total > 0).length;
  const tried = data.coffees.filter(c => c.tried).length;
  return <>
    <PageHeader eyebrow="UM DIÁRIO, MUITAS POSSIBILIDADES" title="Sua jornada começa aqui." description="Um espaço para cultivar seu olhar, seu paladar e suas histórias com o café." />
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy"><span className="eyebrow"><span className="small-rule" /> O PRAZER ESTÁ NO CAMINHO</span><h2 id="hero-title">Uma xícara.<br />Infinitas descobertas.</h2><p>Desacelere. Sinta o aroma. Cada café é um convite para descobrir algo novo.</p><ActionLink href="#/preparar">Preparar um café</ActionLink><span className="hero-footnote"><Leaf size={14} aria-hidden="true" />No seu tempo, do seu jeito.</span></div>
      <div className="hero-art"><CoffeeRitual /><span className="illustration-caption">pequenos rituais, grandes encontros</span></div>
    </section>
    <section className="collection-summary" aria-label="Resumo da sua coleção">
      <div className="summary-intro"><span className="eyebrow">SEU UNIVERSO DO CAFÉ</span><span>Tudo começa com curiosidade.</span></div>
      <div className="summary-item"><Coffee size={21} aria-hidden="true" /><span><strong>{loading || error ? '—' : data.coffees.length} {data.coffees.length === 1 ? 'café conhecido' : 'cafés conhecidos'}</strong><small>Histórias na sua estante</small></span></div>
      <div className="summary-item"><BookOpen size={21} aria-hidden="true" /><span><strong>{loading || error ? '—' : tried} {tried === 1 ? 'experimentado' : 'experimentados'}</strong><small>Encontros que já aconteceram</small></span></div>
      <div className="summary-item"><Sprout size={21} aria-hidden="true" /><span><strong>{loading || error ? '—' : stocked} com estoque</strong><small>Para os próximos momentos</small></span></div>
    </section>
    <div className="home-sections">
      <section aria-labelledby="shelf-title"><div className="section-heading"><div><span className="section-number">01 /</span><h2 id="shelf-title">Minha estante</h2></div><a className="text-link" href="#/cafes">Ver coleção <ArrowRight size={16} aria-hidden="true" /></a></div>{data.coffees.length ? <div className="shelf-coffees">{shelfCoffees(data).map(coffee => <CoffeeCard key={coffee.id} coffee={coffee} />)}</div> : <Card className="shelf-card"><div className="coffee-bags" aria-hidden="true"><div className="coffee-bag"><Leaf /></div><div className="coffee-bag coffee-bag--tall"><Coffee /></div><div className="coffee-bag"><Sprout /></div><span className="shelf-line" /></div><EmptyState compact icon={Coffee} title="Um lugar para os seus favoritos">Sua coleção de cafés vai morar aqui.<br /><a className="text-link" href="#/cafes/novo">Adicionar meu primeiro café <ArrowRight size={15} /></a></EmptyState></Card>}</section>
      <section aria-labelledby="recent-title"><div className="section-heading"><div><span className="section-number">02 /</span><h2 id="recent-title">Minha Jornada recente</h2></div><a className="text-link" href="#/jornada" aria-label="Ver Minha Jornada"><ArrowRight size={18} aria-hidden="true" /></a></div><Card className="recent-card">{recent.length ? <ul className="home-journey-recent">{recent.map(item => <li key={item.id}><a href={item.kind === 'preparation' ? `#/preparar/historico/${item.preparation.id}` : '#/jornada/diario'}><time dateTime={item.at}>{journeyDate(item.at)}</time><h3>{item.kind === 'preparation' ? item.preparation.snapshot.recipe.name : item.reflection.title || 'Reflexão pessoal'}</h3><span>{item.kind === 'preparation' ? item.preparation.snapshot.coffee?.name || 'Preparo concluído' : 'Uma página do meu diário'}</span></a></li>)}</ul> : <EmptyState compact icon={BookOpen} title="Toda jornada tem uma primeira página">Seus preparos e reflexões vão dar vida a este espaço.</EmptyState>}<a href="#/jornada" className="text-link">Conhecer minha jornada <ArrowRight size={15} aria-hidden="true" /></a></Card></section>
    </div>
    <div className="page-signature"><Sprout size={17} aria-hidden="true" /><span>O café é o começo. A jornada é sua.</span></div>
  </>;
}

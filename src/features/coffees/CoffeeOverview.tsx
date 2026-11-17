import { Bean, ChevronRight, Package, Sprout } from 'lucide-react';
import { useCollection } from '../../data/CollectionContext';
import { CoffeeCard } from './CoffeeCard';
import { CollectionHeading } from './CollectionHeading';
import { ActionLink, Card, EmptyState } from '../../components/ui';

export function CoffeeOverview() {
  const { data } = useCollection();
  const recent = [...data.coffees].sort((a,b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).slice(0,3);
  const links = [
    { title: 'Cafés', text: 'Veja e gerencie seus cafés.', href: '#/cafes/colecao', count: data.coffees.length, icon: Bean, tone: 'terra' },
    { title: 'Produtores', text: 'Conheça os produtores e a origem dos seus cafés.', href: '#/cafes/origens', count: data.records.filter(r => r.kind === 'producer').length, icon: Sprout, tone: 'olive' },
    { title: 'Pacotes', text: 'Acompanhe seus pacotes, torra e estoque.', href: '#/cafes/pacotes', count: data.packages.length, icon: Package, tone: 'terra' },
  ];
  return <><CollectionHeading title="Meus Cafés" description="Os cafés que eu conheço, experimento e guardo na memória." back="#/inicio" /><div className="collection-statistics" aria-label="Resumo dos cadastros">{links.map(({ title, href, count, icon: Icon, tone }) => <a className={`collection-statistic collection-statistic--${tone}`} href={href} key={title}><Icon size={32} aria-hidden="true" /><div><strong>{count}</strong><span>{title}</span></div></a>)}</div><div className="collection-overview-content"><nav className="collection-entry-links" aria-label="Gerenciar Meus Cafés">{links.map(({ title, text, href, icon: Icon, tone }) => <a className="card collection-entry-link" href={href} key={title}><span className={`collection-entry-icon collection-entry-icon--${tone}`}><Icon size={38} strokeWidth={1.4} aria-hidden="true" /></span><div><h2>{title}</h2><p>{text}</p></div><ChevronRight size={26} aria-hidden="true" /></a>)}</nav><section aria-labelledby="collection-recent-title"><div className="section-heading"><h2 id="collection-recent-title">Cafés recentes</h2><a className="text-link" href="#/cafes/colecao">Ver todos <ChevronRight size={20} aria-hidden="true" /></a></div><p className="field-hint">Os três cadastros mais recentes, pela data de criação.</p>{recent.length ? <div className="coffee-grid collection-recent-grid">{recent.map(c => <CoffeeCard key={c.id} coffee={c} />)}</div> : <Card><EmptyState icon={Bean} title="O próximo café pode ser o primeiro">Adicione um café para começar sua coleção. Só o nome é necessário.</EmptyState><ActionLink href="#/cafes/novo">Cadastrar café</ActionLink></Card>}</section></div></>;
}

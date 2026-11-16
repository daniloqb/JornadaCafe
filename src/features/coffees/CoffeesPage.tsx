import { coffeeSearchText } from '../../domain/coffee-profile';
import { useState } from 'react';
import { Coffee, LayoutGrid, List, PackageOpen, Plus } from 'lucide-react';
import { BackLink, ActionLink, Button, Card, EmptyState, LoadingIndicator, PageHeader, TextInput } from '../../components/ui';
import { useCollection } from '../../data/CollectionContext';
import { inventory, normalizeText } from '../../domain/collection';
import { CoffeeCard } from './CoffeeCard';
import { CoffeeDetail } from './CoffeeDetail';
import { CoffeeForm } from './CoffeeForm';
import { RelatedRecords } from './RelatedRecords';

export function CoffeesPage({ search, onSearch, view, onView, path }: { search: string; onSearch: (value: string) => void; view: 'grid' | 'list'; onView: (value: 'grid' | 'list') => void; path: string }) {
  const { data, loading, error } = useCollection();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const parts = path.split('/').filter(Boolean);
  const id = parts[1];
  const isRecords = id === 'origens';
  if (loading) return <div className="collection-loading"><LoadingIndicator>Organizando sua estante…</LoadingIndicator></div>;
  if (id === 'novo') return error ? null : <CoffeeForm key="new-coffee" />;
  if (id && !isRecords) {
    const coffee = data.coffees.find(c => c.id === id);
    if (!coffee) return <><PageHeader eyebrow="SUA COLEÇÃO" title="Café não encontrado" description="Este café pode ter sido excluído em outra aba." /><BackLink href="#/cafes">Voltar à coleção</BackLink></>;
    return parts[2] === 'editar' ? <CoffeeForm existing={coffee} key={coffee.id} /> : <CoffeeDetail coffee={coffee} key={coffee.id} />;
  }
  const query = normalizeText(search);
  const coffees = data.coffees.filter(c => {
    const matches = normalizeText(coffeeSearchText(data, c)).includes(query);
    const stock = inventory(data, c.id).total;
    return matches && (filter === 'all' || (filter === 'tried' && c.tried) || (filter === 'stock' && stock > 0) || (filter === 'empty' && stock === 0));
  }).sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name, 'pt-BR') : b.createdAt.localeCompare(a.createdAt));
  return <>
    <PageHeader eyebrow="CAFÉS QUE FAZEM PARTE DA SUA HISTÓRIA" title="Meus Cafés" description="Cada embalagem guarda uma origem. Cada café, uma possibilidade."><a href="#/cafes/novo" className={`button button--primary ${error ? 'link-disabled' : ''}`} aria-disabled={!!error}><Plus size={17} />Adicionar café</a></PageHeader>
    <div className="collection-perspectives" aria-label="Perspectivas da coleção"><a href="#/cafes" aria-current={!isRecords ? 'page' : undefined}>Cafés</a><a href="#/cafes/origens" aria-current={isRecords ? 'page' : undefined}>Produtores e Origens</a></div>
    {isRecords ? <RelatedRecords selectedId={parts[2]} /> : <>
      <div className="collection-toolbar"><TextInput label="Pesquisar cafés na coleção" placeholder="Buscar café, produtor, origem ou nota…" value={search} onChange={event => onSearch(event.target.value)} /><div className="view-switch" role="group" aria-label="Visualização da coleção"><Button variant="secondary" aria-label="Visualização em grade" aria-pressed={view === 'grid'} onClick={() => onView('grid')}><LayoutGrid size={19} /></Button><Button variant="secondary" aria-label="Visualização em lista" aria-pressed={view === 'list'} onClick={() => onView('list')}><List size={21} /></Button></div></div>
      <div className="collection-filters"><div className="filter-options" role="group" aria-label="Filtrar cafés">{[['all','Todos'],['tried','Já experimentei'],['stock','Com estoque'],['empty','Sem estoque']].map(([value,label]) => <Button key={value} variant="secondary" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div><label className="sort-field">Ordenar<select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Mais recentes</option><option value="name">Nome (A–Z)</option></select></label></div>
      <div className="collection-label"><span><Coffee size={16} aria-hidden="true" />Sua coleção</span><span>{coffees.length} de {data.coffees.length} cafés</span></div>
      {coffees.length ? <div className={`coffee-grid ${view === 'list' ? 'coffee-grid--list' : ''}`}>{coffees.map(coffee => <CoffeeCard key={coffee.id} coffee={coffee} />)}</div> : <Card className="collection-area"><EmptyState icon={data.coffees.length ? PackageOpen : Coffee} title={data.coffees.length ? 'Nenhum café por aqui com essa combinação' : 'O próximo café pode ser o primeiro'}>{data.coffees.length ? 'Tente outro nome, produtor ou origem, ou escolha outro filtro.' : 'Basta o nome para começar. Você pode completar a origem e adicionar pacotes depois.'}</EmptyState>{!data.coffees.length && !error && <ActionLink href="#/cafes/novo">Adicionar meu primeiro café</ActionLink>}</Card>}
    </>}
  </>;
}

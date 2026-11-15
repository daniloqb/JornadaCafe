import { Coffee, LayoutGrid, List, PackageOpen } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, TextInput } from '../../components/ui';

export function CoffeesPage({ search, onSearch, view, onView }: { search: string; onSearch: (value: string) => void; view: 'grid' | 'list'; onView: (value: 'grid' | 'list') => void }) {
  return <>
    <PageHeader eyebrow="CAFÉS QUE FAZEM PARTE DA SUA HISTÓRIA" title="Meus Cafés" description="Cada embalagem guarda uma origem. Cada café, uma possibilidade." />
    <div className="collection-toolbar"><TextInput label="Pesquisar cafés na coleção" placeholder="Buscar um café na sua estante…" value={search} onChange={(event) => onSearch(event.target.value)} /><div className="view-switch" role="group" aria-label="Visualização da coleção"><Button variant="secondary" title="Visualização em grade" aria-label="Visualização em grade" aria-pressed={view === 'grid'} onClick={() => onView('grid')}><LayoutGrid size={19} /></Button><Button variant="secondary" title="Visualização em lista" aria-label="Visualização em lista" aria-pressed={view === 'list'} onClick={() => onView('list')}><List size={21} /></Button></div></div>
    <div className="collection-label"><span><Coffee size={16} aria-hidden="true" /> Sua coleção</span><span>Nenhum café cadastrado</span></div>
    <Card className={`collection-area collection-area--${view}`}><EmptyState icon={search.trim() ? PackageOpen : Coffee} title={search.trim() ? 'Sua estante ainda está vazia' : 'O próximo café pode ser o primeiro'}>{search.trim() ? <>Ainda não há cafés para pesquisar por “{search.trim()}”.</> : <>Reserve este lugar para os cafés que cruzarem seu caminho: suas origens, produtores e embalagens.</>}</EmptyState><p className="phase-note">O cadastro de cafés estará disponível nas próximas fases.</p></Card>
    <div className="editorial-note"><span className="eyebrow">UMA ESTANTE COM PERSONALIDADE</span><p>Dos grãos que surpreendem aos que viram companhia.<br />Aqui, cada café terá o seu lugar.</p></div>
  </>;
}

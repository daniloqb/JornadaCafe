import { useState } from 'react';
import { Package } from 'lucide-react';
import { useCollection } from '../../data/CollectionContext';
import { grams, type CoffeePackage } from '../../domain/collection';
import { CollectionHeading } from './CollectionHeading';
import { Button, Card, EmptyState } from '../../components/ui';
import { Dialog } from '../../components/forms';
import { PackageForm } from './PackageForm';

export function PackagesPage() {
  const { data } = useCollection();
  const [editing, setEditing] = useState<{ packet: CoffeePackage; correction: boolean }>();
  return <><CollectionHeading title="Meus pacotes" description="Os pacotes cadastrados e o estoque de cada café." /><div className="collection-overview-content">{data.packages.length ? <div className="records-grid">{[...data.packages].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(p => <Card className="package-card" key={p.id}><Package size={25} aria-hidden="true" /><h2>{p.description || 'Pacote de café'}</h2><a className="text-link" href={`#/cafes/${p.coffeeId}`}>{data.coffees.find(c => c.id === p.coffeeId)?.name || 'Café indisponível'}</a><p>{grams(p.remainingWeight)} de {grams(p.initialWeight)}{p.remainingWeight === 0 ? ' · Esgotado' : ''}</p>{p.roastedOn && <p>Torra: <time dateTime={p.roastedOn}>{new Date(p.roastedOn+'T12:00:00').toLocaleDateString('pt-BR')}</time></p>}<div className="package-actions"><Button variant="secondary" onClick={() => setEditing({ packet:p, correction:false })}>Editar pacote</Button><Button variant="secondary" onClick={() => setEditing({ packet:p, correction:true })}>Corrigir estoque</Button><a className="text-link" href={`#/cafes/${p.coffeeId}`}>Ver ficha e histórico →</a></div></Card>)}</div> : <Card><EmptyState icon={Package} title="Seus pacotes vão aparecer aqui">Adicione ou gerencie os pacotes na ficha de cada café.</EmptyState><a className="text-link" href="#/cafes/colecao">Abrir coleção →</a></Card>}</div>{editing && <Dialog title={editing.correction ? 'Corrigir estoque' : 'Editar pacote'} onClose={() => setEditing(undefined)}><PackageForm coffeeId={editing.packet.coffeeId} existing={editing.packet} correction={editing.correction} onClose={() => setEditing(undefined)} /></Dialog>}</>;
}

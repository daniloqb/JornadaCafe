import { sensoryTags } from '../../domain/coffee-profile';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { grams, inventory, recordName, type Coffee } from '../../domain/collection';
import { useCollection } from '../../data/CollectionContext';
import { Star } from 'lucide-react';

export function CoffeeCard({ coffee }: { coffee: Coffee }) {
  const { data } = useCollection();
  const stock = inventory(data, coffee.id);
  return <a className="card coffee-card" href={`#/cafes/${coffee.id}`}><CoffeePhoto id={coffee.photoId} name={coffee.name} /><div className="coffee-card-copy"><div className="coffee-card-name"><h3>{coffee.name}</h3>{coffee.favorite && <Star size={16} aria-label="Favorito da estante" fill="currentColor" />}</div><p>{coffee.roast || recordName(data, coffee.roasterId) || recordName(data, coffee.producerId) || 'Detalhes por descobrir'}</p><div className="coffee-tags"><span>Conheço</span>{sensoryTags(data, coffee).map(tag => <span key={tag.id}>{tag.name}</span>)}{coffee.tried && <span>Já experimentei</span>}{stock.total > 0 ? <span className="stock-tag">{grams(stock.total)} em casa</span> : <span>Sem estoque</span>}</div></div></a>;
}

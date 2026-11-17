import { sensoryTags, speciesName } from '../../domain/coffee-profile';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { grams, inventory, recordName, type Coffee } from '../../domain/collection';
import { useCollection } from '../../data/CollectionContext';
import { Star } from 'lucide-react';

export function CoffeeCard({ coffee }: { coffee: Coffee }) {
  const { data } = useCollection();
  const stock = inventory(data, coffee.id);
  return <a className="card coffee-card" href={`#/cafes/${coffee.id}`}><div className="coffee-card-image"><CoffeePhoto id={coffee.photoId} name={coffee.name} />{coffee.ratings?.overall !== undefined && <span className="coffee-rating-badge"><Star size={15} fill="currentColor" aria-hidden="true" />{coffee.ratings.overall}/10<span className="sr-only"> — Avaliação geral</span></span>}</div><div className="coffee-card-copy"><div className="coffee-card-name"><h3>{coffee.name}</h3>{coffee.favorite && <Star size={16} aria-label="Favorito da estante" fill="currentColor" />}</div><p>{[speciesName(data, coffee), coffee.process, coffee.roast].filter(Boolean).join(' · ') || recordName(data, coffee.producerId) || recordName(data, coffee.roasterId) || 'Detalhes por descobrir'}</p><div className="coffee-tags"><span>Conheço</span>{sensoryTags(data, coffee).map(tag => <span key={tag.id}>{tag.name}</span>)}{coffee.tried && <span>Já experimentei</span>}{stock.total > 0 ? <span className="stock-tag">{grams(stock.total)} em casa</span> : <span>Sem estoque</span>}</div></div></a>;
}

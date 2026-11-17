import { ArrowLeft, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { BackLink } from '../../components/ui';

export function CollectionHeading({ title, label = 'Meus Cafés', description, image = 'coffees-hero', back = '#/cafes', children, actions, className = '', historyBack = false }: { title: string; label?: ReactNode; description: string; image?: string; back?: string; children?: ReactNode; actions?: ReactNode; className?: string; historyBack?: boolean }) {
  const backContent = <><ArrowLeft size={24} aria-hidden="true" /><span className="sr-only">Voltar</span></>;
  return <header className={`collection-editorial-heading ${className}`}><img src={`/images/${image}.png`} alt="" fetchPriority="high" /><div className="collection-editorial-masthead">{back && (historyBack ? <BackLink className="collection-back" href={back}>{backContent}</BackLink> : <a className="collection-back" href={back} aria-label="Voltar">{backContent}</a>)}<Sprout size={29} aria-hidden="true" /><span>{label}</span>{actions}</div><div className="collection-editorial-copy"><h1 tabIndex={-1}>{title}</h1><p>{description}</p><span className="journey-brush" aria-hidden="true" />{children}</div></header>;
}

import { ArrowLeft, Coffee, Filter } from 'lucide-react';
import { BackLink } from '../../components/ui';

export function PreparationHeading({ recipeName, backHref, guided = false }: { recipeName?: string; backHref: string; guided?: boolean }) {
  return <header className={`preparation-heading${guided ? ' preparation-heading--guided' : ''}`}>
    <BackLink href={backHref}><ArrowLeft size={23} aria-hidden="true" /><span>Voltar</span></BackLink>
    {guided ? <><div className="preparation-heading-title"><h1 tabIndex={-1}>Preparo guiado</h1><p>Minha Jornada pelo Café</p></div><span className="preparation-recipe-chip"><Filter size={23} aria-hidden="true" />{recipeName}</span></> : <span className="preparation-heading-brand"><Coffee size={26} aria-hidden="true" />Minha Jornada pelo Café</span>}
  </header>;
}

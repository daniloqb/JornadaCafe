import { BookOpen, Coffee, Compass, House, Sprout } from 'lucide-react';
import type { Destination } from './navigation';

const items = [
  { id: 'inicio', label: 'Início', icon: House },
  { id: 'cafes', label: 'Meus Cafés', icon: Coffee },
  { id: 'preparar', label: 'Preparar', icon: Sprout },
  { id: 'jornada', label: 'Minha Jornada', icon: BookOpen },
  { id: 'descobertas', label: 'Minhas Descobertas', icon: Compass },
] as const;

export function Navigation({ active }: { active: Destination }) {
  return <nav className="main-navigation" aria-label="Navegação principal">{items.map(({ id, label, icon: Icon }) => (
    <a key={id} href={`#/${id}`} onClick={event => { if (window.location.hash === `#/${id}` && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); window.dispatchEvent(new Event('jornada:navigate')); } }} className={`nav-item ${active === id ? 'is-active' : ''}`} aria-current={active === id ? 'page' : undefined}>
      <Icon size={21} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span>{active === id && <span className="nav-mark" aria-hidden="true" />}
    </a>
  ))}</nav>;
}

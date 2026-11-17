import { Bean, BookOpen, ChevronRight, Coffee, Settings, Sprout } from 'lucide-react';
import { CollectionHeading } from '../coffees/CollectionHeading';

const paths = [
  { title: 'Meus Cafés', description: 'Organize seus cafés, produtores e pacotes.', href: '#/cafes', icon: Bean, tone: 'coffee' },
  { title: 'Preparar', description: 'Siga uma receita, registre o preparo e avalie sua experiência.', href: '#/preparar', icon: Coffee, tone: 'terra' },
  { title: 'Minha Jornada', description: 'Acompanhe sua história com o café, registre reflexões e aprendizados.', href: '#/jornada', icon: BookOpen, tone: 'terra' },
  { title: 'Minhas Descobertas', description: 'Explore padrões, compare experiências e aprofunde seu conhecimento.', href: '#/descobertas', icon: Sprout, tone: 'olive' },
];

export function HomePage() {
  return <div className="home-page editorial-page">
    <CollectionHeading className="home-editorial-heading" back="" image="discoveries-hero" label={<>Minha Jornada<br />pelo Café</>} title="Uma jornada pelo mundo do café" description="Conheça, experimente, registre e descubra o que mais agrada ao seu paladar." actions={<a className="settings-link" href="#/inicio/configuracoes" aria-label="Configurações"><Settings size={26} aria-hidden="true" /></a>} />
    <nav className="home-paths editorial-paper" aria-label="Caminhos da sua jornada pelo café">
      {paths.map(({ title, description, href, icon: Icon, tone }) => <a className="card collection-entry-link home-path" href={href} key={href}>
        <span className={`collection-entry-icon collection-entry-icon--${tone}`}><Icon size={40} strokeWidth={1.5} aria-hidden="true" /></span>
        <div><h2>{title}</h2><p>{description}</p></div><ChevronRight size={25} aria-hidden="true" />
      </a>)}
    </nav>
  </div>;
}

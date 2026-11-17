import { ArrowLeft, BookOpen, ChevronRight, Heart, Lightbulb, Scale, Sprout } from 'lucide-react';
import { useCollection } from '../../data/CollectionContext';
import { BackLink, LoadingIndicator } from '../../components/ui';
import { SensoryProfile } from './SensoryProfile';
import { ExperienceComparison } from './ExperienceComparison';
import { ObservedDiscoveries } from './ObservedDiscoveries';
import { PersonalKnowledge } from './PersonalKnowledge';

const areas = [
  { id: 'perfil', title: 'Meu perfil de café', description: 'As características e sensações que aparecem nas suas avaliações de preparos.', icon: Heart, tone: 'terra' },
  { id: 'comparar', title: 'Comparando experiências', description: 'Observe diferentes preparos do mesmo café e as diferenças registradas.', icon: Scale, tone: 'olive' },
  { id: 'observacoes', title: 'O que venho descobrindo', description: 'Padrões observados e hipóteses a partir das suas experiências e avaliações.', icon: Lightbulb, tone: 'terra' },
  { id: 'conhecimento', title: 'Meu conhecimento', description: 'Um espaço para reunir e revisitar os aprendizados escritos na sua Jornada.', icon: BookOpen, tone: 'espresso' },
] as const;
const introductions = {
  perfil: 'Um retrato das percepções que você informou nas experiências já registradas.',
  comparar: 'Coloque lado a lado preparos do mesmo café, observe as diferenças e formule suas próprias hipóteses.',
  observacoes: 'Padrões e perguntas a partir dos seus registros. Um convite para explorar, sem conclusões definitivas.',
  conhecimento: 'Os aprendizados e as reflexões da sua Jornada, reunidos nas suas próprias palavras.',
};
export function DiscoveriesPage({ path }: { path: string }) {
  const { data, loading, error } = useCollection();
  const [pathname, search = ''] = path.split('?'); const area = areas.find(a => a.id === pathname.split('/')[2]);
  return <div className={`journey-page discoveries-page${area ? ` discoveries-page--${area.id}` : ''}`}>
    <header className="journey-masthead discovery-masthead"><BackLink href={area ? '#/descobertas' : '#/inicio'}><ArrowLeft size={22} aria-hidden="true" /><span className="sr-only">Voltar {area ? 'a Minhas Descobertas' : 'ao início'}</span></BackLink><div><Sprout size={28} strokeWidth={1.6} aria-hidden="true" /><h1 tabIndex={-1}>Minhas Descobertas</h1></div></header>
    <section className={`discovery-hero${area ? ' discovery-hero--inner' : ''}`} aria-labelledby="discovery-title"><img src="/images/discoveries-hero.png" alt="" fetchPriority="high" /><div><span className="eyebrow">{area ? 'MINHAS DESCOBERTAS' : 'MINHA JORNADA PELO CAFÉ'}</span><h2 id="discovery-title">{area?.title || 'Minhas Descobertas'}</h2><span className="journey-brush" aria-hidden="true" /><p>{area ? introductions[area.id] : 'Aprenda com seus próprios preparos, compare experiências e encontre novas perguntas pelo caminho.'}</p></div></section>
    {loading ? <div className="discovery-content"><LoadingIndicator>Reunindo suas experiências…</LoadingIndicator></div> : error ? <p className="discovery-content">Seus registros estarão disponíveis após recuperar o armazenamento.</p> : area ? <>
      {area.id === 'perfil' && <SensoryProfile data={data} />}
      {area.id === 'comparar' && <ExperienceComparison key={path} data={data} query={new URLSearchParams(search)} />}
      {area.id === 'observacoes' && <ObservedDiscoveries data={data} />}
      {area.id === 'conhecimento' && <PersonalKnowledge data={data} />}
      <a className="discovery-return text-link" href="#/descobertas"><ArrowLeft size={17} aria-hidden="true" />Voltar a Minhas Descobertas</a>
    </> : <div className="discovery-entry-cards">{areas.map(({ id, title, description, icon: Icon, tone }) => <a className="card discovery-entry-card" key={id} href={`#/descobertas/${id}`}><span className={`discovery-icon discovery-icon--${tone}`}><Icon size={36} strokeWidth={1.4} aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div><ChevronRight size={25} aria-hidden="true" /></a>)}</div>}
  </div>;
}

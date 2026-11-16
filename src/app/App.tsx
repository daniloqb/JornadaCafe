import { useEffect, useRef, useState } from 'react';
import { Coffee, Leaf, LockKeyhole } from 'lucide-react';
import { LoadingIndicator, Notice } from '../components/ui';
import { useCollection } from '../data/CollectionContext';
import { HomePage } from '../features/home/HomePage';
import { CoffeesPage } from '../features/coffees/CoffeesPage';
import { PreparePage } from '../features/prepare/PreparePage';
import { JourneyPage } from '../features/journey/JourneyPage';
import { DiscoveriesPage } from '../features/discoveries/DiscoveriesPage';
import { Navigation } from './Navigation';
import { currentDestination } from './navigation';
import { ActiveBrewNotice } from '../features/preparations/BrewContext';
import { AppearanceControl } from '../theme/AppearanceControl';
import { Capacitor } from '@capacitor/core';
import { nativePreparation } from '../features/preparations/platform';
import { handleAppBack, trackNavigation } from './history';

export function App() {
  const [active, setActive] = useState(currentDestination);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { loading, error, warning, retry } = useCollection();
  const [path, setPath] = useState(() => window.location.hash.replace(/^#/, '') || '/inicio');
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    const stop = trackNavigation();
    let disposed = false; let remove: (() => Promise<void>) | undefined;
    if (Capacitor.getPlatform() === 'android') {
      void nativePreparation.addListener('back', () => handleAppBack(() => { void nativePreparation.exit().catch(() => undefined); })).then(async handle => {
        if (disposed) { await handle.remove(); return; }
        remove = () => handle.remove();
        await nativePreparation.setNavigationActive({ active: true });
      }).catch(() => undefined);
    }
    return () => { disposed = true; stop(); void remove?.(); if (Capacitor.getPlatform() === 'android') void nativePreparation.setNavigationActive({ active: false }).catch(() => undefined); };
  }, []);

  useEffect(() => {
    const positions = new Map<string, number>();
    let previous = window.location.hash;
    function handleNavigation() {
      positions.set(previous, window.scrollY);
      previous = window.location.hash;
      setActive(currentDestination());
      setPath(window.location.hash.replace(/^#/, '') || '/inicio');
      requestAnimationFrame(() => {
        window.scrollTo(0, positions.get(previous) ?? 0);
        [...(main.current?.querySelectorAll('h1') ?? [])].find(heading => heading.getClientRects().length)?.focus({ preventScroll: true });
      });
    }
    window.addEventListener('hashchange', handleNavigation);
    return () => window.removeEventListener('hashchange', handleNavigation);
  }, []);

  useEffect(() => {
    document.title = `${({ inicio: 'Início', cafes: 'Meus Cafés', preparar: 'Preparar', jornada: 'Minha Jornada', descobertas: 'Minhas Descobertas' })[active]} · Minha Jornada pelo Café`;
  }, [active]);

  return <div className={`app-shell${active === 'preparar' && path.startsWith('/preparar/sessao') ? ' app-shell--brewing' : ''}`}>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>Pular para o conteúdo</a>
    <aside className="sidebar"><a href="#/inicio" className="brand" aria-label="Minha Jornada pelo Café — Início"><span className="brand-icon"><Coffee size={27} strokeWidth={1.4} aria-hidden="true" /></span><span>Minha Jornada<em>pelo Café</em></span></a><span className="sidebar-divider" /><span className="sidebar-label eyebrow">SEU ESPAÇO, SEU RITMO</span><Navigation active={active} /><div className="sidebar-bottom"><Leaf size={24} strokeWidth={1.2} aria-hidden="true" /><p>Entre um gole e outro,<br />um mundo para descobrir.</p><span>UM DIÁRIO FEITO DE CAFÉ.</span></div></aside>
    <div className="main-shell"><div className="topbar"><span>SEU DIÁRIO DE CAFÉS ESPECIAIS</span><AppearanceControl /></div>
      <main id="main-content" ref={main} tabIndex={-1}>
        {error && <Notice title="O armazenamento local precisa de atenção" onRetry={retry}>{error} Você pode explorar as áreas enquanto isso.</Notice>}
        <ActiveBrewNotice />
        {warning && <Notice title="Fotografia antiga">{warning}</Notice>}
        {active === 'inicio' && <HomePage />}
        <div hidden={active !== 'cafes'}><CoffeesPage path={active === 'cafes' ? path : '/cafes'} search={search} onSearch={setSearch} view={view} onView={setView} /></div>
        <div className="prepare-area" hidden={active !== 'preparar'}><PreparePage path={active === 'preparar' ? path : '/preparar'} /></div>
        {active === 'jornada' && <JourneyPage />}
        {active === 'descobertas' && <DiscoveriesPage />}
      </main>
      <footer className="app-footer"><span>Minha Jornada pelo Café <span className="footer-dot">·</span> Cada xícara conta uma história.</span><span>{loading ? <LoadingIndicator>Preparando seu espaço…</LoadingIndicator> : !error ? <span className="storage-ready" role="status"><LockKeyhole size={13} aria-hidden="true" />Armazenamento local pronto</span> : <span>Armazenamento indisponível</span>}</span></footer>
    </div>
  </div>;
}

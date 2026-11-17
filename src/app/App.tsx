import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { useAppearance } from '../theme/appearance';
import { PreparationSettings } from '../features/prepare/PreparationSettings';
import { resetScreenScroll } from './screen-scroll';
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
  useAppearance(); // Keep system/storage/native theme synchronization alive outside Settings.
  const [navigation, setNavigation] = useState(0);
  const [areaPaths, setAreaPaths] = useState(() => ({ cafes: path.startsWith('/cafes') ? path : '/cafes', preparar: path.startsWith('/preparar') ? path : '/preparar' }));

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
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    function handleNavigation() {
      const next = window.location.hash.replace(/^#/, '') || '/inicio';
      setActive(currentDestination());
      setPath(next);
      setAreaPaths(previous => next.startsWith('/cafes') ? { ...previous, cafes: next } : next.startsWith('/preparar') && !next.startsWith('/preparar/configuracoes') ? { ...previous, preparar: next } : previous);
      setNavigation(n => n + 1);
    }
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('jornada:navigate', handleNavigation);
    return () => { window.removeEventListener('hashchange', handleNavigation); window.removeEventListener('jornada:navigate', handleNavigation); history.scrollRestoration = previousRestoration; };
  }, []);

  useLayoutEffect(() => {
    resetScreenScroll(main.current);
    const frame = requestAnimationFrame(() => {
      [...(main.current?.querySelectorAll('h1') ?? [])].find(heading => heading.getClientRects().length)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [path, navigation]);

  useEffect(() => {
    document.title = `${({ inicio: 'Início', cafes: 'Meus Cafés', preparar: 'Preparar', jornada: 'Minha Jornada', descobertas: 'Minhas Descobertas' })[active]} · Minha Jornada pelo Café`;
  }, [active]);

  const brewing = active === 'preparar' && path.startsWith('/preparar/sessao');
  const reviewing = active === 'preparar' && /^\/preparar\/receitas\/[^/]+\/preparar/.test(path);
  const settings = path.startsWith('/inicio/configuracoes') || path.startsWith('/preparar/configuracoes');
  const prepareLibrary = active === 'preparar' && /^\/preparar(?:\/(?:receitas|metodos|tecnicas))?\/?$/.test(path);
  const editorial = (active === 'inicio' && !settings) || (active === 'preparar' && /^\/preparar\/historico\/?$/.test(path));
  return <div className={`app-shell${editorial ? ' app-shell--editorial' : ''}${active === 'cafes' ? ' app-shell--coffees' : ''}${active === 'jornada' ? ' app-shell--journey' : ''}${active === 'descobertas' ? ' app-shell--discoveries' : ''}${brewing ? ' app-shell--brewing' : ''}${reviewing || brewing ? ' app-shell--ritual' : ''}${settings ? ' app-shell--settings' : ''}${prepareLibrary ? ' app-shell--prepare-library' : ''}`}>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>Pular para o conteúdo</a>
    <aside className="sidebar"><a href="#/inicio" className="brand" aria-label="Minha Jornada pelo Café — Início"><span className="brand-icon"><Coffee size={27} strokeWidth={1.4} aria-hidden="true" /></span><span>Minha Jornada<em>pelo Café</em></span></a><span className="sidebar-divider" /><span className="sidebar-label eyebrow">SEU ESPAÇO, SEU RITMO</span><Navigation active={active} /><div className="sidebar-bottom"><Leaf size={24} strokeWidth={1.2} aria-hidden="true" /><p>Entre um gole e outro,<br />um mundo para descobrir.</p><span>UM DIÁRIO FEITO DE CAFÉ.</span></div></aside>
    <div className="main-shell"><div className="topbar"><span>SEU DIÁRIO DE CAFÉS ESPECIAIS</span></div>
      <main id="main-content" ref={main} tabIndex={-1}>
        {error && <Notice title="O armazenamento local precisa de atenção" onRetry={retry}>{error} Você pode explorar as áreas enquanto isso.</Notice>}
        <ActiveBrewNotice />
        {warning && <Notice title="Fotografia antiga">{warning}</Notice>}
        {settings && <PreparationSettings />}
        {active === 'inicio' && !settings && <HomePage />}
        <div hidden={active !== 'cafes' || settings}><CoffeesPage path={areaPaths.cafes} search={search} onSearch={setSearch} view={view} onView={setView} /></div>
        <div className="prepare-area" hidden={active !== 'preparar' || settings}><PreparePage path={areaPaths.preparar} /></div>
        {active === 'jornada' && <JourneyPage path={path} />}
        {active === 'descobertas' && <DiscoveriesPage path={path} />}
      </main>
      <footer className="app-footer"><span>Minha Jornada pelo Café <span className="footer-dot">·</span> Cada xícara conta uma história.</span><span>{loading ? <LoadingIndicator>Preparando seu espaço…</LoadingIndicator> : !error ? <span className="storage-ready" role="status"><LockKeyhole size={13} aria-hidden="true" />Armazenamento local pronto</span> : <span>Armazenamento indisponível</span>}</span></footer>
    </div>
  </div>;
}

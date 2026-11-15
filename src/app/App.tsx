import { useEffect, useRef, useState } from 'react';
import { Coffee, Leaf, LockKeyhole, Sun } from 'lucide-react';
import { LoadingIndicator, Notice } from '../components/ui';
import { initializeStorage } from '../data/storage';
import { HomePage } from '../features/home/HomePage';
import { CoffeesPage } from '../features/coffees/CoffeesPage';
import { PreparePage } from '../features/prepare/PreparePage';
import { JourneyPage } from '../features/journey/JourneyPage';
import { DiscoveriesPage } from '../features/discoveries/DiscoveriesPage';
import { Navigation } from './Navigation';
import { currentDestination } from './navigation';

type StorageState = { status: 'loading' | 'ready' } | { status: 'error'; message: string };

export function App() {
  const [active, setActive] = useState(currentDestination);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [storage, setStorage] = useState<StorageState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleNavigation() {
      setActive(currentDestination());
      window.scrollTo(0, 0);
      requestAnimationFrame(() => main.current?.querySelector('h1')?.focus({ preventScroll: true }));
    }
    window.addEventListener('hashchange', handleNavigation);
    return () => window.removeEventListener('hashchange', handleNavigation);
  }, []);

  useEffect(() => {
    document.title = `${({ inicio: 'Início', cafes: 'Meus Cafés', preparar: 'Preparar', jornada: 'Minha Jornada', descobertas: 'Minhas Descobertas' })[active]} · Minha Jornada pelo Café`;
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    setStorage({ status: 'loading' });
    initializeStorage().then(() => {
      if (!cancelled) setStorage({ status: 'ready' });
    }).catch((error: unknown) => {
      if (!cancelled) setStorage({ status: 'error', message: error instanceof Error ? error.message : 'Não foi possível abrir o armazenamento local.' });
    });
    return () => { cancelled = true; };
  }, [attempt]);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>Pular para o conteúdo</a>
    <aside className="sidebar"><a href="#/inicio" className="brand" aria-label="Minha Jornada pelo Café — Início"><span className="brand-icon"><Coffee size={27} strokeWidth={1.4} aria-hidden="true" /></span><span>Minha Jornada<em>pelo Café</em></span></a><span className="sidebar-divider" /><span className="sidebar-label eyebrow">SEU ESPAÇO, SEU RITMO</span><Navigation active={active} /><div className="sidebar-bottom"><Leaf size={24} strokeWidth={1.2} aria-hidden="true" /><p>Entre um gole e outro,<br />um mundo para descobrir.</p><span>UM DIÁRIO FEITO DE CAFÉ.</span></div></aside>
    <div className="main-shell"><div className="topbar"><span>SEU DIÁRIO DE CAFÉS ESPECIAIS</span><span><Sun size={16} strokeWidth={1.4} aria-hidden="true" />Feito para ir com calma</span></div>
      <main id="main-content" ref={main} tabIndex={-1}>
        {storage.status === 'error' && <Notice title="O armazenamento local precisa de atenção" onRetry={() => setAttempt((value) => value + 1)}>{storage.message} Você pode explorar as áreas enquanto isso.</Notice>}
        {active === 'inicio' && <HomePage />}
        {active === 'cafes' && <CoffeesPage search={search} onSearch={setSearch} view={view} onView={setView} />}
        {active === 'preparar' && <PreparePage />}
        {active === 'jornada' && <JourneyPage />}
        {active === 'descobertas' && <DiscoveriesPage />}
      </main>
      <footer className="app-footer"><span>Minha Jornada pelo Café <span className="footer-dot">·</span> Cada xícara conta uma história.</span><span>{storage.status === 'loading' ? <LoadingIndicator>Preparando seu espaço…</LoadingIndicator> : storage.status === 'ready' ? <span className="storage-ready" role="status"><LockKeyhole size={13} aria-hidden="true" />Armazenamento local pronto</span> : <span>Armazenamento indisponível</span>}</span></footer>
    </div>
  </div>;
}

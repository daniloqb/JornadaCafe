import { goBack } from '../../app/history';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useCollection } from '../../data/CollectionContext';
import { BrewClock } from '../../domain/brew-clock';
import { makeSession, type BrewSession, type Preparation } from '../../domain/preparation';
import type { BrewRecipe } from '../../domain/brewing';
import { BrewAlerts, nativePreparation, readAlertPreferences, saveAlertPreferences, type AlertPreferences } from './platform';
import { Button, Notice } from '../../components/ui';
import { Dialog, FormError, useFormAction } from '../../components/forms';

interface BrewContextValue {
  session?: BrewSession; recovered: boolean; checkpointError?: string; preferences: AlertPreferences; preferenceError: boolean;
  choosePreferences: (value: AlertPreferences) => void; testAlerts: () => void;
  start: (recipe: BrewRecipe, coffeeId?: string, packageId?: string) => Promise<void>;
  pause: () => Promise<void>; resume: () => Promise<void>; next: () => Promise<void>; previous: () => Promise<void>;
  finish: (state: Preparation['state'], notes: string, consume: boolean) => Promise<string>;
  discard: () => Promise<void>; checkpoint: () => Promise<void>;
}
const BrewContext = createContext<BrewContextValue | null>(null);
export function useBrew() { const context = useContext(BrewContext); if (!context) throw new Error('Preparo indisponível.'); return context; }
const onExecutionScreen = () => /^#\/preparar\/sessao(?:\/|$)/.test(location.hash);
export function BrewProvider({ children }: { children: ReactNode }) {
  const collection = useCollection(); const latest = useRef(collection); latest.current = collection;
  const clock = useRef<BrewClock | undefined>(undefined); const closed = useRef(new Set<string>());
  const [session, setSession] = useState<BrewSession>(); const [recovered, setRecovered] = useState(false);
  const [checkpointError, setCheckpointError] = useState<string>();
  const [preferences, setPreferences] = useState(readAlertPreferences); const prefs = useRef(preferences); prefs.current = preferences;
  const [preferenceError, setPreferenceError] = useState(false);
  const alerts = useRef(new BrewAlerts()); const foreground = useRef(false); const nativeVisible = useRef(true);
  const lastAlert = useRef<{ visit?: string; remaining?: number }>({});
  const [leaving, setLeaving] = useState(false); const leaveAction = useFormAction();
  function publish() { const value = clock.current?.read(performance.now(), Date.now()); setSession(value); return value; }
  async function checkpoint() {
    const value = clock.current?.read(performance.now(), Date.now()); if (!value) return;
    try { await latest.current.mutate({ type: 'checkpoint', value }); setCheckpointError(undefined); }
    catch (error) { setCheckpointError(error instanceof Error ? error.message : 'Não foi possível guardar o ponto de recuperação.'); throw error; }
  }
  const checkpointRef = useRef(checkpoint); checkpointRef.current = checkpoint;
  function syncForeground() {
    const visible = onExecutionScreen() && document.visibilityState !== 'hidden' && nativeVisible.current;
    const engine = clock.current;
    if (visible !== foreground.current && engine) {
      if (visible) engine.returnToForeground(performance.now(), Date.now()); else engine.suspend(performance.now(), Date.now());
      lastAlert.current = {}; publish(); void checkpointRef.current().catch(() => undefined);
    }
    foreground.current = visible;
  }
  const syncRef = useRef(syncForeground); syncRef.current = syncForeground;
  useEffect(() => {
    const stored = collection.data.sessions[0];
    if (!collection.loading && stored && !clock.current && !closed.current.has(stored.id)) {
      clock.current = BrewClock.recover(stored, performance.now(), Date.now()); setRecovered(true); publish();
      // Initial non-execution routes still retain a paused, recoverable session.
      if (!onExecutionScreen() || document.visibilityState === 'hidden') clock.current.suspend(performance.now(), Date.now());
      syncRef.current();
    }
  }, [collection.loading, collection.data.sessions]);
  useEffect(() => {
    const visibility = () => syncRef.current();
    const pagehide = () => { clock.current?.suspend(performance.now(), Date.now()); foreground.current = false; void checkpointRef.current().catch(() => undefined); };
    const unload = (event: BeforeUnloadEvent) => { if (clock.current) { void checkpointRef.current().catch(() => undefined); event.preventDefault(); event.returnValue = ''; } };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('hashchange', visibility); window.addEventListener('pageshow', visibility); window.addEventListener('pagehide', pagehide); window.addEventListener('beforeunload', unload);
    const interval = setInterval(() => {
      const engine = clock.current; if (!engine || !foreground.current) return;
      const result = engine.tick(performance.now(), Date.now()); const current = result.session; setSession(current);
      const step = current.snapshot.recipe.steps[current.stepIndex]; const visit = current.executions.at(-1)?.id;
      const remaining = step.advance === 'time' ? Math.ceil(step.durationSeconds! - (current.elapsedMs - current.stepStartedMs) / 1000) : undefined;
      if (result.transitioned) { alerts.current.signal(true, prefs.current); void checkpointRef.current().catch(() => undefined); }
      else if (current.status === 'running' && !current.needsConfirmation && visit === lastAlert.current.visit && remaining !== undefined && lastAlert.current.remaining !== undefined && remaining < lastAlert.current.remaining && remaining > 0 && remaining <= 5) alerts.current.signal(false, prefs.current);
      lastAlert.current = { visit, remaining };
    }, 200);
    const saveInterval = setInterval(() => { if (clock.current) void checkpointRef.current().catch(() => undefined); }, 5000);
    const handles: PluginListenerHandle[] = []; let disposed = false;
    if (Capacitor.getPlatform() === 'android') {
      void nativePreparation.addListener('visibility', event => { nativeVisible.current = event.active !== false; syncRef.current(); }).then(handle => { if (disposed) void handle.remove(); else handles.push(handle); }).catch(() => undefined);
    }
    const back = (event: Event) => { if (clock.current && onExecutionScreen()) { event.preventDefault(); setLeaving(true); } };
    window.addEventListener('jornada:back', back);
    return () => { window.removeEventListener('jornada:back', back); disposed = true; handles.forEach(handle => void handle.remove()); clearInterval(interval); clearInterval(saveInterval); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('hashchange', visibility); window.removeEventListener('pageshow', visibility); window.removeEventListener('pagehide', pagehide); window.removeEventListener('beforeunload', unload); };
  }, []);
  useEffect(() => {
    const active = !!session && onExecutionScreen(); const awake = active && session.status === 'running' && foreground.current;
    let sentinel: WakeLockSentinel | undefined; let disposed = false;
    if (Capacitor.getPlatform() === 'android') void nativePreparation.setActive({ awake }).catch(() => undefined);
    else if (awake && 'wakeLock' in navigator) void navigator.wakeLock.request('screen').then(lock => { if (disposed) void lock.release(); else sentinel = lock; }).catch(() => undefined);
    return () => { disposed = true; void sentinel?.release().catch(() => undefined); if (Capacitor.getPlatform() === 'android') void nativePreparation.setActive({ awake: false }).catch(() => undefined); };
  // A state change/route visibility triggers re-acquisition without cycling the lock on every tick.
  }, [!!session, session?.status, foreground.current]);
  function choosePreferences(value: AlertPreferences) { if (value.sound) alerts.current.unlock(); setPreferences(value); setPreferenceError(!saveAlertPreferences(value)); }
  async function start(recipe: BrewRecipe, coffeeId?: string, packageId?: string) {
    alerts.current.unlock();
    const value = makeSession(latest.current.data, recipe, coffeeId, packageId);
    await latest.current.mutate({ type: 'startSession', value });
    clock.current = new BrewClock(value, performance.now()); setRecovered(false); lastAlert.current = {}; publish();
    location.hash = '/preparar/sessao'; syncRef.current();
  }
  async function control(command: 'pause' | 'resume' | 'next' | 'previous') {
    if (!clock.current) return; if (command === 'resume') { alerts.current.unlock(); setRecovered(false); }
    clock.current[command](performance.now(), Date.now()); lastAlert.current = {}; publish();
    if (command === 'next' || command === 'previous') alerts.current.signal(true, prefs.current);
    await checkpoint();
  }
  async function finish(state: Preparation['state'], notes: string, consume: boolean) {
    const engine = clock.current; if (!engine) throw new Error('Nenhum preparo em andamento.');
    engine.pause(performance.now(), Date.now()); publish(); await checkpoint();
    const value = engine.preparation(state, notes, consume, performance.now(), Date.now());
    await latest.current.mutate({ type: 'finishPreparation', value });
    closed.current.add(value.id); clock.current = undefined; setSession(undefined); setRecovered(false); setCheckpointError(undefined); return value.id;
  }
  async function discard() {
    const id = clock.current?.read(performance.now(), Date.now()).id; if (!id) return;
    await latest.current.mutate({ type: 'discardSession', id }); closed.current.add(id); clock.current = undefined; setSession(undefined); setRecovered(false); setCheckpointError(undefined);
  }
  return <BrewContext.Provider value={{ session, recovered, checkpointError, preferences, preferenceError, choosePreferences, testAlerts: () => { alerts.current.unlock(); setTimeout(() => alerts.current.signal(true, prefs.current), 100); }, start, pause: () => control('pause'), resume: () => control('resume'), next: () => control('next'), previous: () => control('previous'), finish, discard, checkpoint }}>{children}{leaving && <Dialog title="Sair da tela de preparo?" onClose={() => setLeaving(false)} busy={leaveAction.busy}><p>O preparo será pausado e guardado para você retomar. Nenhum registro será descartado e nenhum estoque será descontado.</p><FormError error={leaveAction.error} /><div className="form-actions"><Button variant="secondary" disabled={leaveAction.busy} onClick={() => setLeaving(false)}>Continuar aqui</Button><Button disabled={leaveAction.busy} onClick={() => void leaveAction.run(async () => { await control('pause'); setLeaving(false); goBack('#/preparar'); })}>Guardar e sair</Button></div></Dialog>}</BrewContext.Provider>;
}
export function ActiveBrewNotice() {
  const { session, recovered, checkpointError, checkpoint } = useBrew();
  if (!session) return null;
  return <>{(!onExecutionScreen() || recovered) && <div className="active-brew-notice" role="status"><div><strong>{recovered ? 'Há um preparo para recuperar' : 'Preparo em andamento'}</strong><p>{session.snapshot.recipe.name} · {session.status === 'paused' ? 'pausado' : 'cronômetro em andamento'}</p></div><a className="button button--secondary" href="#/preparar/sessao">{recovered ? 'Revisar e retomar' : 'Voltar ao preparo'}</a></div>}{checkpointError && <Notice title="Não foi possível atualizar a recuperação" onRetry={() => void checkpoint().catch(() => undefined)}>{checkpointError} O cronômetro continua nesta sessão.</Notice>}</>;
}

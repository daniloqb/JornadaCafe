import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { useLayoutEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';
// Also read by the small, blocking initialization script in index.html.
const PREFERENCE_KEY = 'jornada-cafe:appearance';
const NativeAppearance = registerPlugin<{ setTheme(options: { theme: 'light' | 'dark' }): Promise<void> }>('Appearance');

function normalizeAppearance(value: string | null | undefined): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function applyAppearance(appearance: Appearance) {
  const theme = appearance === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : appearance;
  const root = document.documentElement;
  root.dataset.appearance = appearance;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const background = getComputedStyle(root).getPropertyValue('--color-background').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);

  if (Capacitor.getPlatform() === 'android') {
    // Native padding behind the system bars also needs to match on older WebViews.
    void NativeAppearance.setTheme({ theme })
      .catch((error: unknown) => console.warn('Não foi possível atualizar o fundo nativo.', error));
    // SystemBars.Dark means light icons on a dark background, and vice versa.
    void SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
      .catch((error: unknown) => console.warn('Não foi possível atualizar as barras do sistema.', error));
  }
}

export function useAppearance() {
  const [appearance, setAppearance] = useState(() => normalizeAppearance(document.documentElement.dataset.appearance));
  const [saveFailed, setSaveFailed] = useState(false);

  useLayoutEffect(() => {
    applyAppearance(normalizeAppearance(document.documentElement.dataset.appearance));
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (document.documentElement.dataset.appearance === 'system') applyAppearance('system');
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== PREFERENCE_KEY && event.key !== null) return;
      const next = normalizeAppearance(event.newValue);
      applyAppearance(next);
      setAppearance(next);
      setSaveFailed(false);
    };
    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        applyAppearance(normalizeAppearance(document.documentElement.dataset.appearance));
      }
    };
    const handleAppearanceChoice = () => setAppearance(normalizeAppearance(document.documentElement.dataset.appearance));
    window.addEventListener('jornada:appearance', handleAppearanceChoice);
    media.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleResume);
    return () => {
      window.removeEventListener('jornada:appearance', handleAppearanceChoice);
      media.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, []);

  function chooseAppearance(next: Appearance) {
    applyAppearance(next);
    setAppearance(next);
    window.dispatchEvent(new Event('jornada:appearance'));
    try {
      localStorage.setItem(PREFERENCE_KEY, next);
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }

  return { appearance, chooseAppearance, saveFailed };
}

import { useLayoutEffect, useState } from 'react';

// Keep these choices and the key in sync with the pre-render restoration in index.html.
export const TEXT_SIZE_KEY = 'jornada-cafe:text-size';
export const textSizes = [85, 90, 100, 110, 115] as const;
export type TextSize = typeof textSizes[number];
export function normalizeTextSize(value: unknown): TextSize {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return textSizes.includes(number as TextSize) ? number as TextSize : 100;
}
export function applyTextSize(value: TextSize) {
  document.documentElement.dataset.textSize = String(value);
  document.documentElement.style.setProperty('--user-font-scale', String(value / 100));
}
export function saveTextSize(value: TextSize) {
  applyTextSize(value);
  window.dispatchEvent(new Event('jornada:text-size'));
  try { localStorage.setItem(TEXT_SIZE_KEY, String(value)); return true; }
  catch { return false; }
}

export function useTextSize() {
  const [size, setSize] = useState(() => normalizeTextSize(document.documentElement.dataset.textSize));
  const [saveFailed, setSaveFailed] = useState(false);
  useLayoutEffect(() => {
    applyTextSize(normalizeTextSize(document.documentElement.dataset.textSize));
    const choice = () => setSize(normalizeTextSize(document.documentElement.dataset.textSize));
    const storage = (event: StorageEvent) => {
      if (event.key !== TEXT_SIZE_KEY && event.key !== null) return;
      const next = normalizeTextSize(event.newValue); applyTextSize(next); setSize(next); setSaveFailed(false);
    };
    window.addEventListener('jornada:text-size', choice);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('jornada:text-size', choice); window.removeEventListener('storage', storage); };
  }, []);
  function chooseSize(next: TextSize) { setSaveFailed(!saveTextSize(next)); }
  return { size, chooseSize, saveFailed };
}

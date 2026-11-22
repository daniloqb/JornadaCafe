import { applyAppearance, normalizeAppearance } from '../theme/appearance';
import { normalizeTextSize, saveTextSize, TEXT_SIZE_KEY } from '../theme/text-size';
import { readAlertPreferences, saveAlertPreferences } from '../features/preparations/platform';
import { PENDING_PREFERENCES, type PortablePreferences } from './core';
import type { LocalStorage } from '../domain/local-storage';
import { validatePreferences } from './validation';
export function readPortablePreferences():PortablePreferences {
  return {appearance:normalizeAppearance(localStorage.getItem('jornada-cafe:appearance')),textSize:normalizeTextSize(localStorage.getItem(TEXT_SIZE_KEY)),alerts:readAlertPreferences()};
}
/** Committed alongside restored data; retry after interruption or localStorage failure. */
export async function recoverPreferences(storage:LocalStorage){
  const pending=await storage.getMetadata(PENDING_PREFERENCES);if(!pending)return;
  const p:unknown=JSON.parse(pending);validatePreferences(p);
  localStorage.setItem('jornada-cafe:appearance',p.appearance);
  if(!saveTextSize(p.textSize)||!saveAlertPreferences(p.alerts))throw new Error('Os dados foram restaurados, mas as preferências aguardam nova tentativa.');
  applyAppearance(p.appearance);window.dispatchEvent(new Event('jornada:appearance'));
  await storage.setMetadata(PENDING_PREFERENCES,'');
}

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export const nativePreparation = registerPlugin<{
  setActive(options: { awake: boolean }): Promise<void>;
  setNavigationActive(options: { active: boolean }): Promise<void>;
  exit(): Promise<void>;
  vibrate(): Promise<void>;
  addListener(event: string, handler: (data: { active?: boolean }) => void): Promise<PluginListenerHandle>;
}>('Preparation');
const preferenceKey = 'jornada-cafe:brew-alerts';
export interface AlertPreferences { sound: boolean; vibration: boolean }
export function readAlertPreferences(): AlertPreferences {
  try { const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? '{}'); return { sound: saved.sound === true, vibration: saved.vibration === true }; } catch { return { sound: false, vibration: false }; }
}
export function saveAlertPreferences(value: AlertPreferences) { try { localStorage.setItem(preferenceKey, JSON.stringify(value)); return true; } catch { return false; } }
export class BrewAlerts {
  private audio?: AudioContext;
  unlock() {
    try { this.audio ??= new AudioContext(); void this.audio.resume().catch(() => undefined); } catch { /* Unsupported audio never blocks preparation. */ }
  }
  signal(transition: boolean, preferences: AlertPreferences) {
    if (preferences.sound && this.audio?.state === 'running') {
      try {
        const context = this.audio; const now = context.currentTime;
        for (let i = 0; i < (transition ? 2 : 1); i++) {
          const oscillator = context.createOscillator(); const gain = context.createGain();
          oscillator.frequency.value = transition ? 880 : 660;
          gain.gain.setValueAtTime(0, now + i * .17); gain.gain.linearRampToValueAtTime(.12, now + i * .17 + .01); gain.gain.exponentialRampToValueAtTime(.001, now + i * .17 + .12);
          oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now + i * .17); oscillator.stop(now + i * .17 + .13);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        }
      } catch { /* Optional. */ }
    }
    if (preferences.vibration) {
      if (Capacitor.getPlatform() === 'android') void nativePreparation.vibrate().catch(() => undefined);
      else try { navigator.vibrate?.(transition ? [80, 50, 80] : 40); } catch { /* Optional. */ }
    }
  }
  close() { void this.audio?.close().catch(() => undefined); }
}

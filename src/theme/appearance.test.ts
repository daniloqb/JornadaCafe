import { afterEach, expect, it, vi } from 'vitest';
import { applyAppearance, normalizeAppearance } from './appearance';

afterEach(() => vi.unstubAllGlobals());
it('preserva as escolhas explícitas e normaliza preferências ausentes ou inválidas', () => {
  expect(normalizeAppearance('dark')).toBe('dark'); expect(normalizeAppearance('light')).toBe('light');
  for (const value of ['system','inválido',null,undefined]) expect(normalizeAppearance(value)).toBe('system');
});
it('aplica o tema global sem depender de um seletor montado na tela', () => {
  const root = { dataset: {} as Record<string,string>, style: { colorScheme: '' } }; const setAttribute = vi.fn();
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
  vi.stubGlobal('document', { documentElement: root, querySelector: () => ({ setAttribute }) });
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => ' #2B1D17 ' }));
  applyAppearance('light'); expect(root.dataset).toEqual({ appearance: 'light', theme: 'light' });
  applyAppearance('dark'); expect(root.style.colorScheme).toBe('dark');
  expect(setAttribute).toHaveBeenCalledWith('content','#2B1D17');
});
it('resolve Automático conforme o sistema, mantendo a preferência como system', () => {
  const root = { dataset: {} as Record<string,string>, style: {} }; let dark = true;
  vi.stubGlobal('window', { matchMedia: () => ({ matches: dark }) });
  vi.stubGlobal('document', { documentElement: root, querySelector: () => null });
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#F5EBDD' }));
  applyAppearance('system'); expect(root.dataset).toEqual({ appearance:'system',theme:'dark' });
  dark=false; applyAppearance('system'); expect(root.dataset).toEqual({ appearance:'system',theme:'light' });
});

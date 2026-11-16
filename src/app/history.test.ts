import { afterEach, describe, expect, it, vi } from 'vitest';
import { canGoBack, goBack, handleAppBack, trackNavigation } from './history';

function browser() {
  const target = new EventTarget();
  const entries: { hash: string; state: unknown }[] = [{ hash: '#/inicio', state: null }];
  let position = 0;
  const location = { get hash() { return entries[position].hash; }, set hash(value: string) { entries.splice(position + 1); entries.push({ hash: value, state: null }); position++; target.dispatchEvent(new Event('hashchange')); }, get href() { return 'https://localhost/' + this.hash; } };
  const history = { get state() { return entries[position].state; }, replaceState(state: unknown) { entries[position].state = state; }, back: vi.fn(() => { if (position) { position--; target.dispatchEvent(new Event('hashchange')); } }), forward() { if (position + 1 < entries.length) { position++; target.dispatchEvent(new Event('hashchange')); } } };
  vi.stubGlobal('window', target); vi.stubGlobal('location', location); vi.stubGlobal('history', history);
  vi.stubGlobal('document', { querySelectorAll: () => [] });
  return { target, history, location };
}
afterEach(() => vi.unstubAllGlobals());
describe('retorno pelas telas visitadas', () => {
  it('percorre as entradas, preserva o ponto inicial e aceita outro caminho após voltar', () => {
    const b = browser(); const stop = trackNavigation();
    const exit = vi.fn();
    b.location.hash = '#/preparar'; b.location.hash = '#/preparar/metodos';
    handleAppBack(exit); expect(b.location.hash).toBe('#/preparar'); expect(exit).not.toHaveBeenCalled();
    b.history.forward(); expect(b.location.hash).toBe('#/preparar/metodos');
    goBack(); b.location.hash = '#/cafes'; goBack(); expect(b.location.hash).toBe('#/preparar');
    goBack(); expect(canGoBack()).toBe(false); handleAppBack(exit); expect(exit).toHaveBeenCalledOnce(); stop();
  });
  it('conserva a posição após reiniciar o acompanhamento e usa destino seguro em acesso direto', () => {
    const b = browser(); const stop = trackNavigation(); b.location.hash = '#/preparar/metodos'; stop();
    const again = trackNavigation(); goBack(); expect(b.location.hash).toBe('#/inicio');
    goBack('#/preparar'); expect(b.location.hash).toBe('/preparar'); again();
  });
  it('fecha o diálogo primeiro e respeita a confirmação do preparo antes de navegar ou sair', () => {
    const b = browser(); const stop = trackNavigation(); const exit = vi.fn();
    const dialog = new EventTarget(); const cancel = vi.fn(); dialog.addEventListener('cancel', cancel);
    vi.stubGlobal('document', { querySelectorAll: () => [dialog] }); handleAppBack(exit); expect(cancel).toHaveBeenCalledOnce(); expect(exit).not.toHaveBeenCalled();
    vi.stubGlobal('document', { querySelectorAll: () => [] });
    const guard = (event: Event) => event.preventDefault(); b.target.addEventListener('jornada:back', guard);
    handleAppBack(exit); expect(exit).not.toHaveBeenCalled(); expect(b.history.back).not.toHaveBeenCalled();
    b.target.removeEventListener('jornada:back', guard); handleAppBack(exit); expect(exit).toHaveBeenCalledOnce(); stop();
  });
});

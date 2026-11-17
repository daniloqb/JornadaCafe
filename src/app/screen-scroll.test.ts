import { afterEach, expect, it, vi } from 'vitest';
import { resetScreenScroll } from './screen-scroll';

afterEach(() => vi.unstubAllGlobals());
it('reposiciona o viewport e o ancestral que rola, preservando componentes internos', () => {
  const viewport = { scrollTop: 900, scrollLeft: 20 };
  const nestedList = { scrollTop: 120 };
  const ancestor = { parentElement: null, scrollHeight: 1000, clientHeight: 500, scrollTop: 300, overflowY: 'auto' };
  const main = { parentElement: ancestor, scrollHeight: 1000, clientHeight: 1000, scrollTop: 100, overflowY: 'visible', nestedList };
  const scrollTo = vi.fn();
  vi.stubGlobal('window', { scrollTo }); vi.stubGlobal('document', { scrollingElement: viewport });
  vi.stubGlobal('getComputedStyle', (element: typeof main) => ({ overflowY: element.overflowY }));
  resetScreenScroll(main as unknown as HTMLElement);
  expect(viewport).toEqual({ scrollTop: 0, scrollLeft: 0 });
  expect(ancestor.scrollTop).toBe(0); expect(nestedList.scrollTop).toBe(120);
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
});
it('aceita a ausência do conteúdo sem procurar ou reposicionar listas', () => {
  const scrollTo = vi.fn(); vi.stubGlobal('window', { scrollTo }); vi.stubGlobal('document', { scrollingElement: null });
  resetScreenScroll(null); expect(scrollTo).toHaveBeenCalledOnce();
});

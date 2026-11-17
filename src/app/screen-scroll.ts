/** Only reset the viewport and ancestors that actually scroll this screen. */
export function resetScreenScroll(main: HTMLElement | null) {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const viewport = document.scrollingElement;
  if (viewport) { viewport.scrollTop = 0; viewport.scrollLeft = 0; }
  for (let node = main; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) node.scrollTop = 0;
  }
}

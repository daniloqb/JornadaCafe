const key = 'jornadaNavigation';
function index(): number | undefined {
  const value = history.state?.[key]?.index;
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Marks only this document's entries, so Back never traverses outside the app. */
export function trackNavigation() {
  let current = index() ?? 0;
  const mark = () => history.replaceState({ ...history.state, [key]: { index: current } }, '', location.href);
  if (!location.hash) history.replaceState(history.state, '', '#/inicio');
  mark();
  const changed = () => { current = index() ?? current + 1; mark(); };
  window.addEventListener('hashchange', changed);
  return () => window.removeEventListener('hashchange', changed);
}
export function canGoBack() { return (index() ?? 0) > 0; }
export function goBack(fallback?: string) {
  if (canGoBack()) history.back();
  else if (fallback) location.hash = fallback.replace(/^#/, '');
}

export function handleAppBack(exit: () => void) {
  const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
  if (dialog) { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); return; }
  // The brew provider can pause/checkpoint through its existing confirmation.
  if (!window.dispatchEvent(new Event('jornada:back', { cancelable: true }))) return;
  if (canGoBack()) goBack(); else exit();
}

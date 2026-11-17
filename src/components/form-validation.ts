import type { FormEvent } from 'react';

/** Reveal the first invalid control synchronously, before native focus/validation. */
export function revealInvalidField(event: FormEvent<HTMLFormElement>) {
  const field = event.target as HTMLInputElement;
  if (event.currentTarget.querySelector(':invalid') !== field) return;
  for (let node = field.parentElement; node && node !== event.currentTarget; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement) node.open = true;
  }
  field.setAttribute('aria-invalid', 'true');
  field.addEventListener('input', () => field.removeAttribute('aria-invalid'), { once: true });
  requestAnimationFrame(() => { field.focus(); field.scrollIntoView({ block: 'center', behavior: 'instant' }); });
}

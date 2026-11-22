import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, Notice } from './ui';

export function Field({ label, hint, ...props }: ComponentProps<'input'> & { label: string; hint?: string }) {
  const id = useId();
  return <label className="form-field"><span id={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</span><input aria-labelledby={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />{hint && <small id={`${id}-hint`}>{hint}</small>}</label>;
}
export function TextArea({ label, ...props }: ComponentProps<'textarea'> & { label: string }) {
  const id = useId();
  return <label className="form-field"><span id={id}>{label}</span><textarea aria-labelledby={id} rows={3} {...props} /></label>;
}
export function FormError({ error }: { error?: string }) { return error ? <Notice title="Não foi possível concluir">{error}</Notice> : null; }
export function useFormAction() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(undefined);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Tente novamente.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return { busy, error, run, resetError: () => setError(undefined) };
}
export function Dialog({ title, children, onClose, busy = false, initialFocus }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; initialFocus?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    if (initialFocus) dialog.querySelector<HTMLElement>(initialFocus)?.focus();
    return () => dialog.close();
  }, [initialFocus]);
  return createPortal(<dialog ref={ref} className="form-dialog" aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><div className="dialog-heading"><h2>{title}</h2><Button type="button" variant="secondary" aria-label="Fechar janela" onClick={onClose} disabled={busy}><X size={19} /></Button></div>{children}</dialog>, document.body);
}
export const formText = (data: FormData, name: string): string | undefined => String(data.get(name) ?? '').trim() || undefined;
export function formNumber(data: FormData, name: string): number | undefined {
  const text = formText(data, name);
  return text === undefined ? undefined : Number(text.replace(',', '.'));
}

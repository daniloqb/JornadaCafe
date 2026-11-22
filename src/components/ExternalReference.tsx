import { Capacitor } from '@capacitor/core';
import { useState, type ReactNode } from 'react';
import { safeReferenceUrl } from '../domain/brewing';
import { openNativeReference } from '../features/prepare/reference-links';

export function ExternalReference({ url, className, children }: { url?: string; className?: string; children: ReactNode }) {
  const [error, setError] = useState('');
  const safe = safeReferenceUrl(url);
  if (!safe) return null;
  return <><a className={className} href={safe} target="_blank" rel="noopener noreferrer" onClick={event => {
    if (!safeReferenceUrl(url)) { event.preventDefault(); return; }
    if (Capacitor.getPlatform() === 'android') {
      event.preventDefault(); setError('');
      void openNativeReference(url!).catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a referência.'));
    }
  }}>{children}</a>{error && <p className="field-hint" role="alert">{error}</p>}</>;
}

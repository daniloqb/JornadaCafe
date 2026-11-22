import { Capacitor, registerPlugin } from '@capacitor/core';
import { safeReferenceUrl } from '../../domain/brewing';

const nativeLinks = registerPlugin<{ open(options: { url: string }): Promise<void> }>('ReferenceLinks');

export async function openNativeReference(value: string): Promise<void> {
  const url = safeReferenceUrl(value);
  if (!url) throw new Error('Informe uma referência HTTP ou HTTPS válida.');
  if (Capacitor.getPlatform() !== 'android') throw new Error('A referência deve ser aberta pelo navegador.');
  await nativeLinks.open({ url });
}

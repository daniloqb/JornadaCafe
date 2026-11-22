import { beforeEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' }, registerPlugin: () => native }));
import { openNativeReference } from './reference-links';
beforeEach(() => { native.open.mockReset(); native.open.mockResolvedValue(undefined); });
it.each(['javascript:alert(1)', 'data:text/html,x', 'file:///private/file', 'intent://app'])('não envia %s ao Android', async url => {
  await expect(openNativeReference(url)).rejects.toThrow('HTTP'); expect(native.open).not.toHaveBeenCalled();
});
it('envia o endereço completo e propaga falhas sem presumir abertura', async () => {
  const url = 'https://example.org/watch?v=abc&list=def#t=42'; await openNativeReference(url); expect(native.open).toHaveBeenCalledWith({ url });
  native.open.mockRejectedValueOnce(Error('Sem navegador')); await expect(openNativeReference(url)).rejects.toThrow('Sem navegador');
});

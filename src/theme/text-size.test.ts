import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, expect, it, vi } from 'vitest';
import { applyTextSize, normalizeTextSize, saveTextSize, TEXT_SIZE_KEY, textSizes } from './text-size';

afterEach(() => vi.unstubAllGlobals());
const startup = readFileSync(new URL('../../index.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1];
function root() { return { dataset: { appearance: 'dark', theme: 'dark' } as Record<string,string>, style: { setProperty: vi.fn(), colorScheme: '' } }; }

it('aceita apenas as cinco escolhas e usa 100% para preferências ausentes ou inválidas', () => {
  expect(textSizes).toEqual([85,90,100,110,115]);
  for (const value of textSizes) expect(normalizeTextSize(String(value))).toBe(value);
  for (const value of [null,undefined,'',95,105,NaN,Infinity,{},[],true,'maior']) expect(normalizeTextSize(value)).toBe(100);
});
it('restaura 100% no primeiro render de uma instalação sem preferência de texto', () => {
  const element = root();
  runInNewContext(startup, { document: { documentElement: element }, localStorage: { getItem: (key: string) => key === 'jornada-cafe:appearance' ? 'dark' : null }, matchMedia: () => ({ matches:false }) });
  expect(element.dataset).toMatchObject({ textSize:'100', appearance:'dark', theme:'dark' });
  expect(element.style.setProperty).toHaveBeenCalledWith('--user-font-scale','1');
});
it('restaura cada escala antes do React mantendo a aparência independente', () => {
  for (const size of textSizes) {
    const element = root();
    runInNewContext(startup, { document: { documentElement: element }, localStorage: { getItem: (key: string) => key === TEXT_SIZE_KEY ? String(size) : 'light' }, matchMedia: () => ({ matches:true }) });
    expect(element.dataset).toMatchObject({ textSize:String(size), appearance:'light', theme:'light' });
    expect(element.style.setProperty).toHaveBeenCalledWith('--user-font-scale',String(size/100));
  }
});
it('aplica imediatamente, persiste só a preferência de texto e permite restaurar o padrão', () => {
  const element=root(); const setItem=vi.fn(); const dispatchEvent=vi.fn();
  vi.stubGlobal('document',{documentElement:element});vi.stubGlobal('localStorage',{setItem});vi.stubGlobal('window',{dispatchEvent});
  expect(saveTextSize(90)).toBe(true);
  expect(element.dataset).toMatchObject({textSize:'90',appearance:'dark',theme:'dark'});
  expect(element.style.setProperty).toHaveBeenCalledWith('--user-font-scale','0.9');
  expect(setItem).toHaveBeenCalledWith(TEXT_SIZE_KEY,'90');
  expect(saveTextSize(100)).toBe(true);
  expect(setItem).toHaveBeenLastCalledWith(TEXT_SIZE_KEY,'100');
  expect(dispatchEvent).toHaveBeenCalledTimes(2);
});
it('mantém a escala da sessão quando o armazenamento falha, sem alterar a aparência', () => {
  const element=root();vi.stubGlobal('document',{documentElement:element});vi.stubGlobal('window',{dispatchEvent:vi.fn()});
  vi.stubGlobal('localStorage',{setItem:()=>{throw new Error('Indisponível');}});
  expect(saveTextSize(115)).toBe(false);
  expect(element.dataset).toEqual({appearance:'dark',theme:'dark',textSize:'115'});
  applyTextSize(85);expect(element.style.setProperty).toHaveBeenLastCalledWith('--user-font-scale','0.85');
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLibraryArchive, createPersonalArchive } from './archive';
import { fixture, preferences } from './fixtures.test-helper';
import { allLibrarySelection, buildLibrary } from './library';
import { base64ToBytes, sha256 } from './core';
const native = vi.hoisted(() => ({ prepare:vi.fn(), append:vi.fn(), discard:vi.fn(), save:vi.fn(), share:vi.fn() }));
vi.mock('@capacitor/core',()=>({Capacitor:{getPlatform:()=> 'android'},registerPlugin:()=>native}));
import { saveArchive, shareArchive } from './platform';
let uploaded:Uint8Array;
beforeEach(()=>{
 vi.clearAllMocks();uploaded=new Uint8Array();
 native.prepare.mockImplementation(async()=>{uploaded=new Uint8Array();return {token:'opaque-cache-token'};});native.discard.mockResolvedValue(undefined);
 native.append.mockImplementation(async({offset,base64})=>{expect(offset).toBe(uploaded.length);const bytes=base64ToBytes(base64);expect(bytes.length).toBeLessThanOrEqual(192*1024);const next=new Uint8Array(offset+bytes.length);next.set(uploaded);next.set(bytes,offset);uploaded=next;});
 native.save.mockImplementation(async options=>({saved:true,bytes:options.size}));native.share.mockResolvedValue({opened:true});
});
describe('exportação Android com opções pequenas no ciclo de vida da Activity',()=>{
 it('transfere backup com fotos em partes e leva só referência, tamanho e hash ao SAF',async()=>{
  const state=fixture();for(const p of state.photos){const image=new Uint8Array(600000);image.set([255,216,255]);image.set([255,217],image.length-2);crypto.getRandomValues(image.subarray(3,60000));p.blob=new Blob([image]);}
  const archive=await createPersonalArchive(state,preferences);
  expect(await saveArchive(archive)).toContain('Arquivo salvo');expect(uploaded).toEqual(archive.bytes);
  const options=native.save.mock.calls[0][0];expect(options.sha256).toBe(await sha256(archive.bytes));expect(JSON.stringify(options).length).toBeLessThan(512);expect(options).not.toHaveProperty('base64');expect(native.append.mock.calls.length).toBeGreaterThan(1);expect(native.discard).toHaveBeenCalledOnce();
 });
 it('trata cancelamento e permite nova tentativa sem sucesso falso',async()=>{const archive=await createPersonalArchive(fixture(),preferences);native.save.mockResolvedValueOnce({cancelled:true});expect(await saveArchive(archive)).toContain('cancelado');expect(await saveArchive(archive)).toContain('Arquivo salvo');expect(native.discard).toHaveBeenCalledTimes(2);});
 it('propaga falhas de escrita e libera o temporário',async()=>{native.save.mockRejectedValueOnce(Error('Falha de escrita'));const archive=await createPersonalArchive(fixture(),preferences);await expect(saveArchive(archive)).rejects.toThrow('Falha de escrita');expect(native.discard).toHaveBeenCalledOnce();expect(await saveArchive(archive)).toContain('Arquivo salvo');});
 it('não abre seletor quando a preparação falha e recusa retornos incompletos',async()=>{const archive=await createPersonalArchive(fixture(),preferences);native.append.mockRejectedValueOnce(Error('Sem espaço'));await expect(saveArchive(archive)).rejects.toThrow('Sem espaço');expect(native.save).not.toHaveBeenCalled();expect(native.discard).toHaveBeenCalledOnce();native.save.mockResolvedValue({saved:true,bytes:0});await expect(saveArchive(archive)).rejects.toThrow('Não foi possível');});
 it('recusa arquivo vazio antes de chamar o plugin',async()=>{const archive=await createPersonalArchive(fixture(),preferences);await expect(saveArchive({...archive,bytes:new Uint8Array()})).rejects.toThrow('vazio');expect(native.prepare).not.toHaveBeenCalled();});
 it('preserva biblioteca ao salvar e compartilhar, sem conteúdo no Bundle e mantendo arquivo compartilhado',async()=>{const state=fixture();const archive=await createLibraryArchive((await buildLibrary(state.data,allLibrarySelection(state.data))).library);await saveArchive(archive);expect(uploaded).toEqual(archive.bytes);native.discard.mockClear();await shareArchive(archive);expect(JSON.stringify(native.share.mock.calls[0][0]).length).toBeLessThan(512);expect(native.discard).not.toHaveBeenCalled();});
});

import { Capacitor, registerPlugin } from '@capacitor/core';
import { base64ToBytes, bytesToBase64, LIMITS, sha256 } from './core';
import type { GeneratedArchive } from './archive';
const nativeFiles=registerPlugin<{
 choose():Promise<{cancelled?:boolean;base64?:string}>;
 prepare():Promise<{token:string}>;
 append(options:{token:string;offset:number;base64:string}):Promise<void>;
 discard(options:{token:string}):Promise<void>;
 save(options:NativeArchive):Promise<{saved?:boolean;cancelled?:boolean;bytes?:number}>;
 share(options:NativeArchive):Promise<{opened?:boolean}>;
}>('DataFiles');
interface NativeArchive { token:string; name:string; size:number; sha256:string }
// Activity options must remain small: Capacitor persists them twice in its Bundle.
async function withNativeArchive<T>(archive:GeneratedArchive, action:(file:NativeArchive)=>Promise<T>, retain=false):Promise<T>{
 if(!archive.bytes.length||archive.bytes.length>LIMITS.zip)throw new Error('Arquivo vazio ou maior que 96 MB.');
 const hash=await sha256(archive.bytes);
 const {token}=await nativeFiles.prepare();let completed=false;
 try{
  for(let offset=0;offset<archive.bytes.length;offset+=192*1024)await nativeFiles.append({token,offset,base64:bytesToBase64(archive.bytes.subarray(offset,offset+192*1024))});
  const result=await action({token,name:archive.name,size:archive.bytes.length,sha256:hash});completed=true;return result;
 }finally{if(!retain||!completed)await nativeFiles.discard({token}).catch(()=>undefined);}
}
export const isAndroid=()=>Capacitor.getPlatform()==='android';
export async function chooseNativeArchive():Promise<Uint8Array|undefined>{const result=await nativeFiles.choose();if(result.cancelled)return;if(!result.base64)throw new Error('O arquivo não pôde ser lido.');const bytes=base64ToBytes(result.base64);if(bytes.length>LIMITS.zip)throw new Error('Escolha um ZIP de até 96 MB.');return bytes;}
export async function saveArchive(archive:GeneratedArchive):Promise<string>{
 if(isAndroid())return withNativeArchive(archive,async file=>{
  const result=await nativeFiles.save(file);
  if(result.cancelled)return 'Salvamento cancelado. O arquivo continua disponível nesta tela.';
  if(!result.saved||result.bytes!==archive.bytes.length)throw new Error('Não foi possível concluir o salvamento. Seus dados permanecem no aplicativo. Tente novamente.');
  return 'Arquivo salvo no destino escolhido.';
 });
 const url=URL.createObjectURL(new Blob([new Uint8Array(archive.bytes).buffer],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=archive.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'Download solicitado. Confira o arquivo na pasta de downloads.';
}
export async function shareArchive(archive:GeneratedArchive):Promise<string>{
 if(isAndroid()){await withNativeArchive(archive,async file=>{const result=await nativeFiles.share(file);if(!result.opened)throw new Error('Não foi possível abrir o compartilhamento.');},true);return 'Menu de compartilhamento aberto. Confirme no destino escolhido se o arquivo foi recebido ou salvo.';}
 const file=new File([new Uint8Array(archive.bytes).buffer],archive.name,{type:'application/zip'});
 if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Minha Jornada pelo Café'});return 'Compartilhamento concluído pelo navegador. Confira o destino escolhido.';}
 return saveArchive(archive);
}

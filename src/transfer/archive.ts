import { photoType, validatePhoto } from '../data/photo-validation';
import { zipSync, Unzip, UnzipInflate, type Zippable } from 'fflate';
import type { CollectionData } from '../domain/collection';
import { APPLICATION, APP_VERSION, PERSONAL_FORMAT_VERSION, LIBRARY_FORMAT_VERSION, LIMITS, canonical, collectionSummary, requiredPhotoIds, sha256, type ArchiveState, type PortablePreferences, type StoredPhoto } from './core';
import { libraryCounts, validateSharedLibrary, verifySharedIdentities, type SharedLibrary } from './library';
import { fail, list, object, text, number, validateCollection, validatePreferences } from './validation';
export type BackupKind='personal-full'|'library-share';
const formatVersion=(kind:BackupKind):typeof PERSONAL_FORMAT_VERSION|typeof LIBRARY_FORMAT_VERSION=>kind==='personal-full'?PERSONAL_FORMAT_VERSION:LIBRARY_FORMAT_VERSION;
export interface Manifest {
  application:typeof APPLICATION; backupKind:BackupKind; formatVersion:1|2; appVersion:string; schemaVersion:5;
  createdAt:string; counts:Record<string,number>; files:{path:string;size:number;sha256:string;mediaType?:string;photoIds?:string[]}[];
}
export interface PersonalArchive { kind:'personal-full'; manifest:Manifest; data:CollectionData; photos:StoredPhoto[]; preferences:PortablePreferences }
export interface LibraryArchive { kind:'library-share'; manifest:Manifest; library:SharedLibrary; photos:StoredPhoto[] }
export type ParsedArchive=PersonalArchive|LibraryArchive;
export interface GeneratedArchive { name:string; bytes:Uint8Array; manifest:Manifest }
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const safePath=(p:string)=>['manifest.json','data/personal.json','data/library.json'].includes(p)||/^(photos|images)\/[a-f\d]{64}\.(jpg|png|webp)$/i.test(p);
const crcTable=Uint32Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const n of bytes)crc=crcTable[(crc^n)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
/** Inspect bounded ZIP32 metadata before a decompressor can allocate entry buffers. */
export function inspectZip(bytes:Uint8Array){
  if(bytes.length<22||bytes.length>LIMITS.zip)fail('ZIP inválido ou maior que 96 MB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const u16=(p:number)=>view.getUint16(p,true),u32=(p:number)=>view.getUint32(p,true);
  let end=bytes.length-22;while(end>=Math.max(0,bytes.length-65558)&&u32(end)!==0x06054b50)end--;if(end<0||end<bytes.length-65558)fail('ZIP inválido.');
  if(end+22+u16(end+20)!==bytes.length||u16(end+20)!==0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))fail('ZIP multipartes ou metadados não suportados.');
  const count=u16(end+10),start=u32(end+16),size=u32(end+12);if(!count||count>LIMITS.entries||start+size!==end)fail('ZIP com estrutura ou quantidade de arquivos inválida.');
  let cursor=start,total=0;const entries=new Map<string,{size:number;crc:number}>();const ranges:{start:number;end:number}[]=[];
  for(let i=0;i<count;i++){
    if(cursor+46>end||u32(cursor)!==0x02014b50)fail('Diretório ZIP corrompido.');
    const flags=u16(cursor+8),compression=u16(cursor+10),compressed=u32(cursor+20),expanded=u32(cursor+24),nameLength=u16(cursor+28),extra=u16(cursor+30),comment=u16(cursor+32),offset=u32(cursor+42);
    if(cursor+46+nameLength+extra+comment>end||flags&1||![0,8].includes(compression)||u16(cursor+34)||((u32(cursor+38)>>>16)&0xf000)===0xa000)fail('Entrada ZIP não suportada.');
    const name=dec.decode(bytes.subarray(cursor+46,cursor+46+nameLength));if(!safePath(name)||entries.has(name))fail('O ZIP contém caminhos inseguros, repetidos ou arquivos inesperados.');
    if(expanded>LIMITS.entry||expanded>Math.max(compressed,1)*1000)fail('Limite de expansão do ZIP excedido.');total+=expanded;if(total>LIMITS.expanded)fail('O ZIP expandido excede 160 MB.');
    if(offset+30>start||u32(offset)!==0x04034b50||u16(offset+6)!==flags||u16(offset+8)!==compression)fail('Cabeçalho ZIP inconsistente.');
    const localNameLength=u16(offset+26),localExtra=u16(offset+28),dataStart=offset+30+localNameLength+localExtra;
    if(dataStart+compressed>start||dec.decode(bytes.subarray(offset+30,offset+30+localNameLength))!==name)fail('Entrada ZIP truncada ou inconsistente.');
    if(!(flags&8)&&(u32(offset+18)!==compressed||u32(offset+22)!==expanded||u32(offset+14)!==u32(cursor+16)))fail('Tamanhos ZIP inconsistentes.');
    if(compression===0&&compressed!==expanded)fail('Tamanho ZIP inválido.');
    ranges.push({start:offset,end:dataStart+compressed});entries.set(name,{size:expanded,crc:u32(cursor+16)});cursor+=46+nameLength+extra+comment;
  }
  if(cursor!==end)fail('Diretório ZIP inválido.');ranges.sort((a,b)=>a.start-b.start);if(ranges[0].start!==0||ranges.some((r,i)=>i>0&&r.start<ranges[i-1].end))fail('Entradas ZIP sobrepostas.');return entries;
}
function unpack(bytes:Uint8Array){
  try{
    const expected=inspectZip(bytes),seen=new Set<string>();const files:Record<string,Uint8Array>=Object.create(null);let expanded=0;let expansionError:Error|undefined;
    const unzip=new Unzip(file=>{
      const entry=expected.get(file.name);if(!entry||seen.has(file.name))fail('Entrada ZIP inesperada ou repetida.');seen.add(file.name);
      let size=0;const chunks:Uint8Array[]=[];
      file.ondata=(error,chunk,final)=>{
        if(expansionError)return;if(error)fail('Não foi possível descompactar o ZIP.');size+=chunk.length;expanded+=chunk.length;
        if(size>entry.size||size>LIMITS.entry||expanded>LIMITS.expanded){expansionError=new Error('Limite real de expansão do ZIP excedido.');file.terminate();return;}
        chunks.push(chunk.slice());
        if(final){if(size!==entry.size)fail('Tamanho ZIP inconsistente.');const complete=new Uint8Array(size);let offset=0;for(const part of chunks){complete.set(part,offset);offset+=part.length;}if(crc32(complete)!==entry.crc)fail('ZIP corrompido: CRC divergente.');files[file.name]=complete;}
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    // Bound actual expansion, even when a hostile ZIP lies about sizes in both headers.
    for(let offset=0;offset<bytes.length;offset+=4096){unzip.push(bytes.subarray(offset,offset+4096),offset+4096>=bytes.length);if(expansionError)throw expansionError;}
    if(Object.keys(files).length!==expected.size)fail('ZIP truncado ou incompleto.');return files;
  }catch(error){if(error instanceof Error&&/ZIP|arquivo|Limite|limite|Entrada|Diretório|Cabeçalho|Tamanho/.test(error.message))throw error;return fail('Não foi possível ler o ZIP. O arquivo está inválido ou corrompido.');}
}
function parseJson(bytes:Uint8Array){try{return JSON.parse(dec.decode(bytes),(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))fail();return value;}) as unknown;}catch{return fail('JSON inválido no arquivo.');}}
export async function parseArchive(bytes:Uint8Array,expectedKind:BackupKind):Promise<ParsedArchive>{
  const files=unpack(bytes);if(!files['manifest.json'])fail('O ZIP não contém manifesto.');
  const m=object(parseJson(files['manifest.json']),['application','backupKind','formatVersion','appVersion','schemaVersion','createdAt','counts','files']);
  if(m.application!==APPLICATION||m.backupKind!==expectedKind)fail(expectedKind==='personal-full'?'Selecione um backup pessoal completo. Bibliotecas não substituem sua jornada.':'Selecione uma biblioteca compartilhável. Backups pessoais não podem ser importados aqui.');
  if(![1,formatVersion(expectedKind)].includes(m.formatVersion as number)||m.schemaVersion!==5)fail('Versão do formato ou do esquema incompatível.');text(m.appVersion);text(m.createdAt);if(!Number.isFinite(Date.parse(m.createdAt)))fail();const counts=object(m.counts);for(const n of Object.values(counts))number(n,0,LIMITS.entities);
  const paths=new Set<string>();for(const value of list(m.files)){const f=object(value,['path','size','sha256','mediaType','photoIds']);text(f.path);text(f.sha256);text(f.mediaType,true);if(f.photoIds!==undefined)for(const id of list(f.photoIds)){text(id);if(!/^[a-f\d-]{36}$/i.test(id))fail('Identidade de fotografia inválida.');}if((!f.path.startsWith('photos/')&&f.photoIds!==undefined)||(!/^(photos|images)\//.test(f.path)&&f.mediaType!==undefined))fail('Metadados inesperados.');number(f.size,0,LIMITS.entry);if(!safePath(f.path)||f.path==='manifest.json'||paths.has(f.path)||!files[f.path]||files[f.path].length!==f.size||await sha256(files[f.path])!==f.sha256)fail('Integridade do conteúdo divergente.');paths.add(f.path);}
  if(Object.keys(files).some(path=>path!=='manifest.json'&&!paths.has(path)))fail('O ZIP contém arquivos não declarados.');
  const manifest=m as unknown as Manifest;
  if(expectedKind==='library-share'){
    if(!paths.has('data/library.json')||[...paths].some(p=>p!=='data/library.json'&&(!p.startsWith('images/')||manifest.formatVersion===1)))fail('A biblioteca contém arquivos inesperados.');
    const library=parseJson(files['data/library.json']);validateSharedLibrary(library);
    if(manifest.formatVersion===1&&library.recipes.some(r=>r.image!==undefined))fail('Fotografias exigem biblioteca versão 2.');
    await verifySharedIdentities(library);
    const required=new Set(library.recipes.flatMap(r=>r.image?[r.image]:[])),photos:StoredPhoto[]=[];
    for(const f of manifest.files.filter(f=>f.path.startsWith('images/'))){
      const {bytes,ext,mime}=await validatePhoto(new Blob([new Uint8Array(files[f.path]).buffer]));
      if(f.mediaType!==mime||f.path!==`images/${f.sha256}.${ext}`||!required.delete(f.sha256))fail('Fotografia da biblioteca inválida ou sem vínculo.');
      photos.push({id:f.sha256,blob:new Blob([bytes.buffer],{type:mime})});
    }
    if(required.size)fail('Uma fotografia declarada está ausente.');
    const expectedCounts={...libraryCounts(library),...(manifest.formatVersion===2?{photos:photos.length}:{})};
    if(canonical(expectedCounts)!==canonical(counts))fail('Contagens do manifesto inconsistentes.');
    return {kind:'library-share',manifest,library,photos};
  }
  if(!paths.has('data/personal.json')||[...paths].some(p=>p!=='data/personal.json'&&!p.startsWith('photos/')))fail('Conteúdo de backup pessoal ausente ou inesperado.');
  const payload=object(parseJson(files['data/personal.json']),['collection','preferences']);validateCollection(payload.collection);validatePreferences(payload.preferences);const data=payload.collection;const photos:StoredPhoto[]=[];
  if(manifest.formatVersion===1&&[...data.recipes,...data.preparations.map(p=>p.snapshot.recipe),...data.sessions.map(p=>p.snapshot.recipe)].some(r=>r.photoId!==undefined))fail('Fotografias de receitas exigem backup pessoal versão 2.');
  const required=new Set(requiredPhotoIds(data)),mapped=new Set<string>();
  for(const f of manifest.files.filter(f=>f.path.startsWith('photos/'))){const bytes=files[f.path],type=photoType(bytes);if(f.mediaType!==type.mime||f.path!==`photos/${f.sha256}.${type.ext}`||!f.photoIds?.length)fail('Fotografia inconsistente.');const blob=new Blob([new Uint8Array(bytes).buffer],{type:type.mime});for(const id of f.photoIds){if(mapped.has(id)||!required.has(id))fail('Fotografia duplicada ou sem vínculo.');mapped.add(id);photos.push({id,blob});}}
  if(required.size!==mapped.size||canonical(collectionSummary(data,photos.length))!==canonical(counts))fail('Fotografia ausente ou contagens do backup inconsistentes.');return {kind:'personal-full',manifest,data,photos,preferences:payload.preferences};
}
function filename(kind:BackupKind,at:Date){const pad=(n:number)=>String(n).padStart(2,'0');return `jornada-cafe-${kind==='personal-full'?'backup-completo':'biblioteca'}-${at.getFullYear()}-${pad(at.getMonth()+1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}.zip`;}
async function generate(kind:BackupKind,files:Record<string,Uint8Array>,counts:Record<string,number>,types:Record<string,string>={},photoIds:Record<string,string[]>={},now=new Date()):Promise<GeneratedArchive>{
  const entries:Manifest['files']=[];for(const path of Object.keys(files).sort())entries.push({path,size:files[path].length,sha256:await sha256(files[path]),...(types[path]?{mediaType:types[path],...(photoIds[path]?{photoIds:photoIds[path]}:{})}:{})});
  const manifest:Manifest={application:APPLICATION,backupKind:kind,formatVersion:formatVersion(kind),appVersion:APP_VERSION,schemaVersion:5,createdAt:now.toISOString(),counts,files:entries};
  const zippable:Zippable={};for(const [path,bytes]of Object.entries({...files,'manifest.json':enc.encode(canonical(manifest))}))zippable[path]=[bytes,{level:/^(photos|images)\//.test(path)?0:6,mtime:new Date(1980,0,1)}];
  const bytes=zipSync(zippable);await parseArchive(bytes,kind);return {name:filename(kind,now),bytes,manifest};
}
export async function createPersonalArchive(state:ArchiveState,preferences:PortablePreferences){
  validateCollection(state.data);validatePreferences(preferences);const files:Record<string,Uint8Array>={'data/personal.json':enc.encode(canonical({collection:state.data,preferences}))},types:Record<string,string>={},photoIds:Record<string,string[]>={};
  for(const id of requiredPhotoIds(state.data)){const photo=state.photos.find(p=>p.id===id);if(!photo)fail('Uma fotografia necessária está ausente. Nenhum backup incompleto foi criado.');const bytes=new Uint8Array(await photo.blob.arrayBuffer());const type=photoType(bytes);const path=`photos/${await sha256(bytes)}.${type.ext}`;files[path]=bytes;types[path]=type.mime;(photoIds[path]??=[]).push(id);}
  return generate('personal-full',files,collectionSummary(state.data),types,photoIds);
}
export async function createLibraryArchive(library:SharedLibrary,photos:StoredPhoto[]=[]){
  validateSharedLibrary(library);await verifySharedIdentities(library);
  const files:Record<string,Uint8Array>={'data/library.json':enc.encode(canonical(library))},types:Record<string,string>={};
  const required=new Set(library.recipes.flatMap(r=>r.image?[r.image]:[]));
  if(photos.length!==required.size||new Set(photos.map(p=>p.id)).size!==photos.length)fail('Fotografias da biblioteca ausentes ou repetidas.');
  for(const photo of photos){const {bytes,ext,mime}=await validatePhoto(photo.blob);const hash=await sha256(bytes);if(photo.id!==hash||!required.has(hash))fail('Fotografia da biblioteca inválida ou sem vínculo.');const path=`images/${hash}.${ext}`;files[path]=bytes;types[path]=mime;}
  return generate('library-share',files,{...libraryCounts(library),photos:photos.length},types);
}

import { describe,expect,it } from 'vitest';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { emptyCollection } from '../domain/collection';
import { createPersonalArchive,createLibraryArchive,parseArchive,inspectZip } from './archive';
import { allLibrarySelection,buildLibrary,planLibraryImport,applyLibraryImport } from './library';
import { canonical,requiredPhotoIds,recoveredCollection,sha256 } from './core';
import { validateCollection } from './validation';
import { fixture,preferences,personalPart } from './fixtures.test-helper';
import { makeSession } from '../domain/preparation';
import { journeySummary,journeyTimeline } from '../domain/journey';
import { coffeeExperiences,sensoryProfile,configurationHypothesis } from '../domain/discoveries';

async function editManifest(bytes:Uint8Array,change:(manifest:Record<string,unknown>,files:Record<string,Uint8Array>)=>void){const files=unzipSync(bytes);const m=JSON.parse(strFromU8(files['manifest.json']));change(m,files);files['manifest.json']=strToU8(JSON.stringify(m));return zipSync(files);}
describe('formatos portáveis e compatibilidade',()=>{
 it('exporta coleção vazia e restaura registros completos, fotos e preferências',async()=>{
  const empty=await createPersonalArchive({data:emptyCollection(),photos:[]},preferences);const parsedEmpty=await parseArchive(empty.bytes,'personal-full');expect(parsedEmpty.kind).toBe('personal-full');
  const state=fixture();validateCollection(state.data);const archive=await createPersonalArchive(state,preferences);const parsed=await parseArchive(archive.bytes,'personal-full');if(parsed.kind!=='personal-full')throw Error();
  expect(parsed.data).toEqual(JSON.parse(JSON.stringify(state.data)));expect(parsed.preferences).toEqual(preferences);expect(parsed.photos.map(p=>p.id).sort()).toEqual(requiredPhotoIds(state.data));
  for(const photo of parsed.photos)expect(await sha256(new Uint8Array(await photo.blob.arrayBuffer()))).toBe(await sha256(new Uint8Array(await state.photos.find(p=>p.id===photo.id)!.blob.arrayBuffer())));
  expect(recoveredCollection(parsed.data).sessions[0]).toMatchObject({id:state.data.sessions[0].id,status:'paused',elapsedMs:45000,needsConfirmation:true});
  expect(journeySummary(parsed.data)).toEqual(journeySummary(state.data));expect(journeyTimeline(parsed.data)).toEqual(journeyTimeline(JSON.parse(JSON.stringify(state.data))));expect(sensoryProfile(parsed.data.preparations)).toEqual(sensoryProfile(state.data.preparations));
 });
 it('inclui fotos históricas uma vez e bloqueia backup com foto ausente',async()=>{const state=fixture();expect(requiredPhotoIds(state.data)).toHaveLength(6);const archive=await createPersonalArchive(state,preferences);expect(Object.keys(unzipSync(archive.bytes)).filter(p=>p.startsWith('photos/'))).toHaveLength(1);await expect(createPersonalArchive({...state,photos:state.photos.slice(1)},preferences)).rejects.toThrow('ausente');});
 it('inclui as dependências e todas as versões de uma receita selecionada',async()=>{const {data}=fixture();const result=await buildLibrary(data,{methods:[],techniques:[],recipes:[data.recipes[1].id]});expect(result.library.methods).toHaveLength(1);expect(result.library.techniques).toHaveLength(1);expect(result.library.recipes).toHaveLength(2);expect(result.automatic.versions).toBe(1);expect(result.library.recipes[1].previousVersionId).toBe(result.library.recipes[0].id);expect(new Set(result.library.recipes.map(r=>r.familyId)).size).toBe(1);});
 it('exporta método ou técnica isolados e recusa seleção vazia ou dependência ausente',async()=>{const {data}=fixture();expect((await buildLibrary(data,{methods:[data.methods[0].id],techniques:[],recipes:[]})).library.recipes).toEqual([]);const tech=await buildLibrary(data,{methods:[],techniques:[data.techniques[0].id],recipes:[]});expect(tech.library.methods).toHaveLength(1);await expect(buildLibrary(data,{methods:[],techniques:[],recipes:[]})).rejects.toThrow('Selecione');await expect(buildLibrary({...data,methods:[]},allLibrarySelection(data))).rejects.toThrow('ausente');});
 it('não transfere sentinelas pessoais, UUIDs, fotografias ou metadados pelo ZIP compartilhável',async()=>{
  const {data}=fixture();Object.assign(data.methods[0],{contact:'PRIVATE_A_CONTACT',devicePath:'/data/PRIVATE_A_PATH'});
  const library=(await buildLibrary(data,allLibrarySelection(data))).library;const archive=await createLibraryArchive(library);const files=unzipSync(archive.bytes);const entire=Object.entries(files).map(([path,bytes])=>path+strFromU8(bytes)).join('\n');
  expect(entire).not.toContain('PRIVATE_A');expect(entire).not.toContain('/data/');expect(Object.keys(files).sort()).toEqual(['data/library.json','manifest.json']);
  const localIds=[...data.coffees,...data.records,...data.packages,...data.methods,...data.techniques,...data.recipes,...data.preparations,...data.sessions,...data.reflections].map(v=>v.id);
  localIds.push(...data.recipes.flatMap(r=>r.steps.map(s=>s.id)),...data.techniques.flatMap(t=>t.sources.map(s=>s.id)),...requiredPhotoIds(data));for(const id of localIds)expect(entire).not.toContain(id);
  expect(entire).not.toMatch(/photoId|coffeeId|createdAt.*createdAt|checkpointAt|consumedGrams|evaluation|appearance|textSize|contact|devicePath/);
  expect(entire).toContain('Crédito público');expect(entire).toContain('27/40');expect(entire).not.toContain('31/60');
 });
 it('distingue os tipos por manifesto e recusa formatos futuros e contagens falsas',async()=>{const state=fixture();const personal=await createPersonalArchive(state,preferences);const library=await createLibraryArchive((await buildLibrary(state.data,allLibrarySelection(state.data))).library);await expect(parseArchive(personal.bytes,'library-share')).rejects.toThrow('biblioteca');await expect(parseArchive(library.bytes,'personal-full')).rejects.toThrow('pessoal');for(const change of [(m:Record<string,unknown>)=>{m.formatVersion=99;},(m:Record<string,unknown>)=>{m.schemaVersion=99;},(m:Record<string,unknown>)=>{m.counts={coffees:999};}])await expect(parseArchive(await editManifest(personal.bytes,change),'personal-full')).rejects.toThrow();});
 it('recusa ZIP inválido, truncado, manifesto ausente, JSON inválido e SHA divergente',async()=>{const state=fixture();const valid=await createPersonalArchive(state,preferences);await expect(parseArchive(new Uint8Array([1,2,3]),'personal-full')).rejects.toThrow();await expect(parseArchive(valid.bytes.slice(0,-5),'personal-full')).rejects.toThrow();await expect(parseArchive(zipSync({'data/personal.json':strToU8('{}')}),'personal-full')).rejects.toThrow('manifesto');const invalidJson=await editManifest(valid.bytes,(_m,files)=>{files['manifest.json']=strToU8('{broken');}); // editManifest rewrites manifest; replace explicitly below.
  const f=unzipSync(invalidJson);f['manifest.json']=strToU8('{broken');await expect(parseArchive(zipSync(f),'personal-full')).rejects.toThrow('JSON');
  await expect(parseArchive(await editManifest(valid.bytes,(_m,files)=>{files['data/personal.json']=strToU8('{}');}),'personal-full')).rejects.toThrow('Integridade');});
 it('recusa entradas inesperadas, caminhos inseguros, symlinks, ZIP64 e expansão exagerada antes de descompactar',async()=>{
  for(const path of ['../escape','/absolute','photos/../x','data/script.js']){const files=Object.create(null);files[path]=strToU8('test');await expect(parseArchive(zipSync(files),'personal-full')).rejects.toThrow();}
  const state=fixture();const valid=await createPersonalArchive(state,preferences);const extra=unzipSync(valid.bytes);extra['data/library.json']=strToU8('{}');await expect(parseArchive(zipSync(extra),'personal-full')).rejects.toThrow('declarados');
  const proto=zipSync({'bad______':strToU8('test')});for(let i=0;i<proto.length-9;i++)if(strFromU8(proto.subarray(i,i+9))==='bad______')proto.set(strToU8('__proto__'),i);await expect(parseArchive(proto,'personal-full')).rejects.toThrow();
  const central=(bytes:Uint8Array)=>{for(let i=0;i<bytes.length-4;i++)if(bytes[i]===80&&bytes[i+1]===75&&bytes[i+2]===1&&bytes[i+3]===2)return i;throw Error();};
  for(const mutate of [(v:DataView,p:number)=>v.setUint32(p+24,0xffffffff,true),(v:DataView,p:number)=>v.setUint32(p+38,0xa0000000,true),(v:DataView,p:number)=>v.setUint32(p+42,0xffffffff,true)]){const bytes=valid.bytes.slice();mutate(new DataView(bytes.buffer),central(bytes));expect(()=>inspectZip(bytes)).toThrow();}
 });
});

describe('compartilhar conhecimento sem substituir a jornada',()=>{
 it('importa em biblioteca vazia, remapeia versões e permite iniciar preparo com a receita recebida',async()=>{const source=fixture();const shared=(await buildLibrary(source.data,allLibrarySelection(source.data))).library;const plan=await planLibraryImport(emptyCollection(),shared);const next=applyLibraryImport(emptyCollection(),plan);expect(next.recipes).toHaveLength(2);expect(next.recipes[1].previousVersionId).toBe(next.recipes[0].id);expect(next.recipes[1].familyId).toBe(next.recipes[0].familyId);expect(next.recipes[0].coffeeId).toBeUndefined();const session=makeSession(next,next.recipes[1]);expect(session.snapshot.recipe.water).toBe(320);expect(session.status).toBe('paused');});
 it('preserva integralmente dados pessoais diferentes no destino e não sobrescreve nomes iguais',async()=>{const source=fixture('PRIVATE_A'),destination=fixture('PRIVATE_B');destination.data.recipes[0].dose=21;const before=canonical(personalPart(destination.data));const shared=(await buildLibrary(source.data,allLibrarySelection(source.data))).library;const plan=await planLibraryImport(destination.data,shared);expect(plan.conflicts).toContain('V60 equilibrado');const next=applyLibraryImport(destination.data,plan);expect(canonical(personalPart(next))).toBe(before);expect(next.recipes).toHaveLength(4);expect(next.methods).toHaveLength(1);expect(next.techniques).toHaveLength(1);expect(next.recipes[0]).toEqual(destination.data.recipes[0]);expect(configurationHypothesis(coffeeExperiences(next)[0].preparations)).toEqual(configurationHypothesis(coffeeExperiences(destination.data)[0].preparations));});
 it('reutiliza conteúdo comprovadamente idêntico e não duplica ao importar ou compartilhar novamente',async()=>{const source=fixture();const shared=(await buildLibrary(source.data,allLibrarySelection(source.data))).library;const first=applyLibraryImport(emptyCollection(),await planLibraryImport(emptyCollection(),shared));const repeated=await planLibraryImport(first,shared);expect(repeated.duplicates).toBe(4);expect(repeated.additions).toEqual({methods:[],techniques:[],recipes:[]});expect(applyLibraryImport(first,repeated)).toEqual(first);expect((await buildLibrary(first,allLibrarySelection(first))).library).toEqual(shared);});
 it('métodos com mesmo nome e diferenças técnicas são independentes',async()=>{const a=fixture(),b=fixture();b.data.methods[0].description='Outro método com nome igual';const shared=(await buildLibrary(a.data,allLibrarySelection(a.data))).library;const next=applyLibraryImport(b.data,await planLibraryImport(b.data,shared));expect(next.methods).toHaveLength(2);expect(next.recipes.at(-1)!.methodId).not.toBe(b.data.methods[0].id);});
 it('não importa grafo inválido ou alterado e recusa prévia desatualizada',async()=>{const source=fixture(),empty=emptyCollection();const shared=(await buildLibrary(source.data,allLibrarySelection(source.data))).library;const plan=await planLibraryImport(empty,shared);await expect(planLibraryImport(empty,{...shared,methods:[]})).rejects.toThrow();await expect(planLibraryImport(empty,{...shared,methods:[...shared.methods,shared.methods[0]]})).rejects.toThrow('duplicada');const tampered=structuredClone(shared);tampered.methods[0].name='Outro conteúdo';await expect(planLibraryImport(empty,tampered)).rejects.toThrow('identidades');expect(()=>applyLibraryImport({...empty,methods:[source.data.methods[0]]},plan)).toThrow('mudou');});
});

it('interrompe expansão real que exceda tamanhos falsos declarados nos cabeçalhos ZIP',async()=>{
 const bytes=zipSync({'data/library.json':strToU8('A'.repeat(1024*1024))});const v=new DataView(bytes.buffer);
 for(let i=0;i<bytes.length-46;i++){if(v.getUint32(i,true)===0x04034b50)v.setUint32(i+22,1,true);if(v.getUint32(i,true)===0x02014b50)v.setUint32(i+24,1,true);}
 await expect(parseArchive(bytes,'library-share')).rejects.toThrow('expansão');
});

it('recusa conteúdo ativo em endereços de referência, duplicação de IDs e relacionamentos pessoais quebrados',()=>{
 const original=fixture().data;
 for(const mutate of [(d:typeof original)=>{d.recipes[0].source!.url='javascript:alert(1)'},(d:typeof original)=>{d.coffees.push(d.coffees[0])},(d:typeof original)=>{d.packages[0].coffeeId='missing'},(d:typeof original)=>{d.reflections[0].association!.id='missing'},(d:typeof original)=>{d.preparations[0].evaluation!.overall=-1},(d:typeof original)=>{d.recipes[1].previousVersionId='missing'}]){const d=structuredClone(original);mutate(d);expect(()=>validateCollection(d)).toThrow();}
});

import { collectionTables, emptyCollection, newEntity, type CollectionData } from '../domain/collection';
import type { BrewMethod, BrewTechnique, BrewRecipe, RecipeStep, SourceReference } from '../domain/brewing';
import { canonical, contentHash, libraryStamp, sha256, type StoredPhoto } from './core';
import { validatePhoto } from '../data/photo-validation';
import { fail, list, object, validateCollection } from './validation';
export interface LibrarySelection { methods: string[]; techniques: string[]; recipes: string[] }
export type SharedMethod = Pick<BrewMethod,'id'|'name'|'description'|'notes'>;
export type SharedTechnique = Pick<BrewTechnique,'id'|'name'|'methodId'|'creator'|'sources'|'principle'|'guidance'|'notes'>;
export type SharedRecipe = Pick<BrewRecipe,'id'|'familyId'|'version'|'previousVersionId'|'versionNote'|'name'|'methodId'|'techniqueId'|'dose'|'water'|'temperature'|'grind'|'grinder'|'filter'|'estimatedSeconds'|'notes'|'source'|'steps'> & { image?: string };
export interface SharedLibrary { methods: SharedMethod[]; techniques: SharedTechnique[]; recipes: SharedRecipe[] }
export interface LibraryImportPlan {
  expectedLibrary: string; additions: { methods: BrewMethod[]; techniques: BrewTechnique[]; recipes: BrewRecipe[] };
  photos: StoredPhoto[]; receivedPhotos: StoredPhoto[]; imageUpdates: { id: string; photoId: string }[]; retainedImages: number;
  received: SharedLibrary; duplicates: number; conflicts: string[]; dispositions: Record<string,'new'|'existing'>;
}
const methodFields=['id','name','description','notes'];
const techniqueFields=['id','name','methodId','creator','sources','principle','guidance','notes'];
const recipeFields=['id','familyId','version','previousVersionId','versionNote','name','methodId','techniqueId','dose','water','temperature','grind','grinder','filter','estimatedSeconds','notes','source','steps','image'];
const technicalSource=(s: SourceReference,id: string):SourceReference=>({id,title:s.title,author:s.author,url:s.url,notes:s.notes});
const technicalStep=(s:RecipeStep,i:number):RecipeStep=>({id:`step-${i+1}`,order:s.order,name:s.name,type:s.type,water:s.water,cumulativeWater:s.cumulativeWater,startSeconds:s.startSeconds,durationSeconds:s.durationSeconds,advance:s.advance,condition:s.condition,notes:s.notes});
export const allLibrarySelection=(data:CollectionData):LibrarySelection=>({methods:data.methods.map(m=>m.id),techniques:data.techniques.map(t=>t.id),recipes:data.recipes.map(r=>r.id)});
export function libraryCounts(library:SharedLibrary){return {methods:library.methods.length,techniques:library.techniques.length,recipes:new Set(library.recipes.map(r=>r.familyId)).size,versions:library.recipes.length};}
export async function buildLibrary(data:CollectionData,selection:LibrarySelection,options:{includeImages?:boolean;readPhoto?:(id:string)=>Promise<Blob|undefined>}={}){
  const methods=new Set(selection.methods),techniques=new Set(selection.techniques),recipes=new Set(selection.recipes);
  if(!methods.size&&!techniques.size&&!recipes.size)fail('Selecione pelo menos um conteúdo para compartilhar.');
  for(const id of [...recipes]){const r=data.recipes.find(r=>r.id===id);if(!r)fail('Uma receita selecionada não está disponível.');for(const v of data.recipes.filter(v=>v.familyId===r.familyId))recipes.add(v.id);}
  for(const id of recipes){const r=data.recipes.find(r=>r.id===id)!;methods.add(r.methodId);if(r.techniqueId)techniques.add(r.techniqueId);}
  for(const id of techniques){const t=data.techniques.find(t=>t.id===id);if(!t)fail('Uma dependência de técnica está ausente.');if(t.methodId)methods.add(t.methodId);}
  const methodMap=new Map<string,string>(),techniqueMap=new Map<string,string>(),recipeMap=new Map<string,string>();
  const out:SharedLibrary={methods:[],techniques:[],recipes:[]};
  const photos=new Map<string,StoredPhoto>(),imageMap=new Map<string,string>();
  if(options.includeImages)for(const id of recipes){const photoId=data.recipes.find(r=>r.id===id)?.photoId;if(!photoId||imageMap.has(photoId))continue;const blob=await options.readPhoto?.(photoId);if(!blob)fail('Uma fotografia de receita está ausente. Nenhum arquivo incompleto foi criado.');const {bytes,mime}=await validatePhoto(blob);const hash=await sha256(bytes);imageMap.set(photoId,hash);photos.set(hash,{id:hash,blob:new Blob([bytes.buffer],{type:mime})});}
  for(const id of [...methods].sort()){
    const m=data.methods.find(m=>m.id===id);if(!m)fail('Uma dependência de método está ausente.');
    const value={name:m.name,description:m.description,notes:m.notes};const sharedId=`m-${await contentHash(value)}`;methodMap.set(id,sharedId);
    if(!out.methods.some(m=>m.id===sharedId))out.methods.push({id:sharedId,...value});
  }
  for(const id of [...techniques].sort()){
    const t=data.techniques.find(t=>t.id===id)!;
    const value={name:t.name,methodId:t.methodId?methodMap.get(t.methodId):undefined,creator:t.creator,sources:t.sources.map((s,i)=>technicalSource(s,`source-${i+1}`)),principle:t.principle,guidance:t.guidance,notes:t.notes};
    const sharedId=`t-${await contentHash(value)}`;techniqueMap.set(id,sharedId);if(!out.techniques.some(t=>t.id===sharedId))out.techniques.push({id:sharedId,...value});
  }
  const families=[...new Set([...recipes].map(id=>data.recipes.find(r=>r.id===id)!.familyId))].sort();
  for(const family of families){
    const versions=data.recipes.filter(r=>r.familyId===family).sort((a,b)=>a.version-b.version);
    const values=versions.map(r=>({version:r.version,versionNote:r.versionNote,name:r.name,methodId:methodMap.get(r.methodId)!,techniqueId:r.techniqueId?techniqueMap.get(r.techniqueId):undefined,dose:r.dose,water:r.water,temperature:r.temperature,grind:r.grind,grinder:r.grinder,filter:r.filter,estimatedSeconds:r.estimatedSeconds,notes:r.notes,source:r.source?technicalSource(r.source,'source-1'):undefined,steps:r.steps.map(technicalStep)}));
    const familyId=`f-${await contentHash(values.map((value,i)=>({...value,previousVersion:versions.find(r=>r.id===versions[i].previousVersionId)?.version})))}`;
    versions.forEach(r=>recipeMap.set(r.id,`${familyId}-v${r.version}`));
    versions.forEach((r,i)=>{const id=recipeMap.get(r.id)!;if(!out.recipes.some(r=>r.id===id))out.recipes.push({id,familyId,previousVersionId:r.previousVersionId?recipeMap.get(r.previousVersionId):undefined,...values[i],...(r.photoId&&imageMap.has(r.photoId)?{image:imageMap.get(r.photoId)}:{})});});
  }
  out.methods.sort((a,b)=>a.id.localeCompare(b.id));out.techniques.sort((a,b)=>a.id.localeCompare(b.id));out.recipes.sort((a,b)=>a.familyId.localeCompare(b.familyId)||a.version-b.version);
  validateSharedLibrary(out);
  return {library:out,photos:[...photos.values()].filter(p=>out.recipes.some(r=>r.image===p.id)),includeImages:options.includeImages===true,maps:{methods:methodMap,techniques:techniqueMap,recipes:recipeMap},automatic:{methods:[...methods].filter(id=>!selection.methods.includes(id)).map(id=>data.methods.find(m=>m.id===id)!.name),techniques:[...techniques].filter(id=>!selection.techniques.includes(id)).map(id=>data.techniques.find(t=>t.id===id)!.name),versions:recipes.size-selection.recipes.length}};
}
export function validateSharedLibrary(value:unknown):asserts value is SharedLibrary{
  const l=object(value,['methods','techniques','recipes']);
  const allIds=new Set<string>();
  for(const [table,fields]of [['methods',methodFields],['techniques',techniqueFields],['recipes',recipeFields]] as const){for(const row of list(l[table])){const o=object(row,[...fields]);if(typeof o.id!=='string'||allIds.has(o.id)||!/^([mt]-[a-f0-9]{64}|f-[a-f0-9]{64}-v[1-9]\d*)$/.test(o.id))fail('Identidade técnica inválida ou duplicada.');allIds.add(o.id);}}
  const data=emptyCollection(),at='2000-01-01T00:00:00Z';const entity={createdAt:at,updatedAt:at};const lib=value as SharedLibrary;
  data.methods=lib.methods.map(m=>({...entity,...m}));data.techniques=lib.techniques.map(t=>({...entity,...t}));data.recipes=lib.recipes.map(({image,...r})=>{if(image!==undefined&&!/^[a-f0-9]{64}$/.test(image))fail('Identidade de imagem inválida.');return {...entity,...r};});validateCollection(data);
}
export async function verifySharedIdentities(library:SharedLibrary){
  const data=emptyCollection(),at='2000-01-01T00:00:00Z';const e={createdAt:at,updatedAt:at};data.methods=library.methods.map(m=>({...e,...m}));data.techniques=library.techniques.map(t=>({...e,...t}));data.recipes=library.recipes.map(({image:_image,...r})=>({...e,...r}));
  const rebuilt=(await buildLibrary(data,allLibrarySelection(data))).library;
  if(canonical(rebuilt)!==canonical({...library,recipes:library.recipes.map(({image:_image,...r})=>r)}))fail('As identidades do conteúdo técnico não correspondem aos dados.');
}
export async function planLibraryImport(data:CollectionData,received:SharedLibrary,photos:StoredPhoto[]=[]):Promise<LibraryImportPlan>{
  validateSharedLibrary(received);await verifySharedIdentities(received);
  const required=new Set(received.recipes.flatMap(r=>r.image?[r.image]:[]));
  if(photos.length!==required.size||new Set(photos.map(p=>p.id)).size!==photos.length)fail('Fotografias da biblioteca ausentes ou repetidas.');
  for(const photo of photos){const {bytes}=await validatePhoto(photo.blob);if(!required.has(photo.id)||await sha256(bytes)!==photo.id)fail('Integridade de fotografia divergente.');}
  const current=data.methods.length||data.techniques.length||data.recipes.length?await buildLibrary(data,allLibrarySelection(data)):undefined;
  const localMaps={methods:new Map<string,string>(),techniques:new Map<string,string>(),recipes:new Map<string,string>()};
  if(current)for(const table of ['methods','techniques','recipes'] as const)for(const [local,shared]of current.maps[table])localMaps[table].set(shared,local);
  const additions:LibraryImportPlan['additions']={methods:[],techniques:[],recipes:[]};const dispositions:LibraryImportPlan['dispositions']={};let duplicates=0;const conflicts:string[]=[];const entities=new Map<string,ReturnType<typeof newEntity>>();
  const allocate=(table:'methods'|'techniques'|'recipes',id:string,name:string)=>{
    const existing=localMaps[table].get(id);if(existing){dispositions[id]='existing';duplicates++;return false;}dispositions[id]='new';
    if(data[table].some(row=>row.name===name))conflicts.push(name);
    const e=newEntity();entities.set(id,e);localMaps[table].set(id,e.id);return true;
  };
  for(const m of received.methods)if(allocate('methods',m.id,m.name))additions.methods.push({...entities.get(m.id)!,name:m.name,description:m.description,notes:m.notes});
  for(const t of received.techniques)if(allocate('techniques',t.id,t.name))additions.techniques.push({...entities.get(t.id)!,name:t.name,methodId:t.methodId?localMaps.methods.get(t.methodId):undefined,creator:t.creator,sources:t.sources.map(s=>({...s,id:crypto.randomUUID()})),principle:t.principle,guidance:t.guidance,notes:t.notes});
  for(const r of received.recipes)allocate('recipes',r.id,r.name);
  const families=new Map<string,string>();
  for(const familyId of new Set(received.recipes.map(r=>r.familyId))){const versions=received.recipes.filter(r=>r.familyId===familyId);const existing=versions.map(r=>data.recipes.find(local=>local.id===localMaps.recipes.get(r.id))).find(Boolean);families.set(familyId,existing?.familyId??localMaps.recipes.get(versions[0].id)!);}
  for(const r of received.recipes)if(entities.has(r.id))additions.recipes.push({...entities.get(r.id)!,familyId:families.get(r.familyId)!,version:r.version,previousVersionId:r.previousVersionId?localMaps.recipes.get(r.previousVersionId):undefined,versionNote:r.versionNote,name:r.name,methodId:localMaps.methods.get(r.methodId)!,techniqueId:r.techniqueId?localMaps.techniques.get(r.techniqueId):undefined,dose:r.dose,water:r.water,temperature:r.temperature,grind:r.grind,grinder:r.grinder,filter:r.filter,estimatedSeconds:r.estimatedSeconds,notes:r.notes,source:r.source?{...r.source,id:crypto.randomUUID()}:undefined,steps:r.steps.map(s=>({...s,id:crypto.randomUUID()}))});
  // Image bytes are presentation, outside the v1-compatible technical identity.
  // Confirmation may fill an absent family image; an existing image is always kept.
  const staged=new Map<string,StoredPhoto>(),imageUpdates:LibraryImportPlan['imageUpdates']=[];
  let retainedImages=0;
  for(const familyId of new Set(received.recipes.map(r=>r.familyId))){
    const versions=received.recipes.filter(r=>r.familyId===familyId),images=new Set(versions.flatMap(r=>r.image?[r.image]:[]));
    if(images.size>1)fail('Uma família declara fotografias divergentes.');
    const image=[...images][0];if(!image)continue;
    const localFamily=families.get(familyId)!;
    if(data.recipes.some(r=>r.familyId===localFamily&&r.photoId)){retainedImages++;continue;}
    let photo=staged.get(image);if(!photo){photo={id:crypto.randomUUID(),blob:photos.find(p=>p.id===image)!.blob};staged.set(image,photo);}
    for(const r of additions.recipes.filter(r=>r.familyId===localFamily))r.photoId=photo.id;
    for(const r of data.recipes.filter(r=>r.familyId===localFamily))imageUpdates.push({id:r.id,photoId:photo.id});
  }
  return {expectedLibrary:libraryStamp(data),additions,photos:[...staged.values()],receivedPhotos:photos,imageUpdates,retainedImages,received,duplicates,conflicts:[...new Set(conflicts)],dispositions};
}
export function applyLibraryImport(data:CollectionData,plan:LibraryImportPlan):CollectionData{
  if(plan.expectedLibrary!==libraryStamp(data))fail('A biblioteca mudou. Selecione novamente o arquivo para atualizar a pré-visualização.');
  const ids=new Set(collectionTables.flatMap(table=>data[table].map(v=>v.id)));
  for(const value of [...plan.additions.methods,...plan.additions.techniques,...plan.additions.recipes]){if(ids.has(value.id))fail('Colisão de identificadores. Atualize a pré-visualização.');ids.add(value.id);}
  const next={...data,methods:[...data.methods,...plan.additions.methods],techniques:[...data.techniques,...plan.additions.techniques],recipes:[...data.recipes.map(r=>{const update=plan.imageUpdates.find(u=>u.id===r.id);return update?{...r,photoId:update.photoId}:r;}),...plan.additions.recipes]};
  // Validate the technical graph alone; personal history can legitimately refer to removed coffee records.
  validateCollection({...emptyCollection(),coffees:data.coffees,records:data.records,methods:next.methods,techniques:next.techniques,recipes:next.recipes});return next;
}

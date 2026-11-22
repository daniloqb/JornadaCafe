import 'fake-indexeddb/auto';
import { DatabaseSync } from 'node:sqlite';
import { describe,it,expect,vi } from 'vitest';
import { SQLiteStorage } from './sqlite-storage';
import { IndexedDBStorage } from './indexeddb-storage';
import { validateStorage,type LocalStorage } from '../domain/local-storage';
import { createPersonalArchive,parseArchive,createLibraryArchive } from '../transfer/archive';
import { allLibrarySelection,buildLibrary,planLibraryImport } from '../transfer/library';
import { canonical,PENDING_PREFERENCES,recoveredCollection,sha256,bytesToBase64,base64ToBytes,type ArchiveState } from '../transfer/core';
import { fixture,preferences,personalPart,stableCollection } from '../transfer/fixtures.test-helper';
import { mutateWithPhotos, saveRecipeWithPhoto } from './media-mutation';
const native=vi.hoisted(()=>({open:vi.fn(),execute:vi.fn(),query:vi.fn(),run:vi.fn(),beginTransaction:vi.fn(),commitTransaction:vi.fn(),rollbackTransaction:vi.fn()}));
const filesystem=vi.hoisted(()=>({readFile:vi.fn(),writeFile:vi.fn(),deleteFile:vi.fn(),readdir:vi.fn(),rmdir:vi.fn(),stat:vi.fn(),getUri:vi.fn()}));
vi.mock('@capacitor-community/sqlite',()=>({CapacitorSQLite:{},SQLiteConnection:class{addUpgradeStatement=async()=>{};checkConnectionsConsistency=async()=>({result:false});isConnection=async()=>({result:false});createConnection=async()=>native;closeConnection=async()=>{};}}));
vi.mock('@capacitor/filesystem',()=>({Directory:{Data:'DATA'},Filesystem:filesystem}));
interface Host { local:LocalStorage;sql?:DatabaseSync;files:Map<string,string>;failWrite:()=>void;corruptRead:()=>void }
async function withStore(engine:string,test:(host:Host)=>Promise<void>){
 const files=new Map<string,string>();let sql:DatabaseSync|undefined;let failWrite=false,corruptRead=false;
 filesystem.writeFile.mockImplementation(async({path,data}:{path:string;data:string})=>{if(failWrite){failWrite=false;throw Error('Falha simulada de fotografia');}files.set(path,data);});
 filesystem.readFile.mockImplementation(async({path}:{path:string})=>{if(!files.has(path))throw Error('File not found');return {data:corruptRead?'Y29ycnVwdA==':files.get(path)};});
 filesystem.readdir.mockImplementation(async({path}:{path:string})=>({files:[...new Set([...files.keys()].filter(p=>p.startsWith(path+'/')).map(p=>p.slice(path.length+1).split('/')[0]))].map(name=>({name}))}));
 filesystem.rmdir.mockImplementation(async({path}:{path:string})=>{for(const p of files.keys())if(p.startsWith(path+'/'))files.delete(p);});
 filesystem.deleteFile.mockImplementation(async({path}:{path:string})=>{files.delete(path);});
 filesystem.stat.mockResolvedValue({});filesystem.getUri.mockImplementation(async({path}:{path:string})=>({uri:path}));
 if(engine==='sqlite'){
  sql=new DatabaseSync(':memory:');native.open.mockResolvedValue(undefined);native.execute.mockImplementation(async(text:string)=>{sql!.exec(text);return {};});native.query.mockImplementation(async(text:string,values:(string|number|null)[]=[])=>({values:sql!.prepare(text).all(...values)}));native.run.mockImplementation(async(text:string,values:(string|number|null)[]=[])=>({changes:sql!.prepare(text).run(...values)}));native.beginTransaction.mockImplementation(async()=>{sql!.exec('BEGIN')});native.commitTransaction.mockImplementation(async()=>{sql!.exec('COMMIT')});native.rollbackTransaction.mockImplementation(async()=>{sql!.exec('ROLLBACK')});
 }
 const local=engine==='sqlite'?new SQLiteStorage():new IndexedDBStorage(`transfer-${crypto.randomUUID()}`);
 try{await validateStorage(local);await test({local,sql,files,failWrite:()=>{failWrite=true;},corruptRead:()=>{corruptRead=true;}});}finally{await local.close();sql?.close();}
}
async function normalizedState(state:ArchiveState){return {data:canonical(stableCollection(state.data)),photos:await Promise.all(state.photos.sort((a,b)=>a.id.localeCompare(b.id)).map(async p=>({id:p.id,sha:await sha256(new Uint8Array(await p.blob.arrayBuffer()))})))};}
async function seed(local:LocalStorage,marker='DESTINATION'){const state=fixture(marker);state.data.sessions=[];await local.replaceState(state.data,state.photos,preferences);return state;}

describe.each(['indexeddb','sqlite'])('transferência transacional em %s',engine=>{
 it('substitui toda a coleção, preserva registros/fotografias e recupera sessões pausadas após reabrir',async()=>withStore(engine,async({local})=>{
  const old=await seed(local);const source=fixture('SOURCE');const archive=await createPersonalArchive(source,preferences);const parsed=await parseArchive(archive.bytes,'personal-full');if(parsed.kind!=='personal-full')throw Error();
  await local.replaceState(parsed.data,parsed.photos,parsed.preferences);await local.close();await validateStorage(local);
  const exported=await local.exportState();expect(canonical(stableCollection(exported.data))).toBe(canonical(stableCollection(recoveredCollection(source.data))));expect(exported.data.coffees.some(c=>c.id===old.data.coffees[0].id)).toBe(false);
  expect((await normalizedState(exported)).photos).toEqual((await normalizedState(source)).photos);expect(JSON.parse((await local.getMetadata(PENDING_PREFERENCES))!)).toEqual(preferences);
  const returned=await parseArchive((await createPersonalArchive(exported,preferences)).bytes,'personal-full');if(returned.kind!=='personal-full')throw Error();expect(canonical(returned.data)).toBe(canonical(exported.data));
 }));
 it('importa biblioteca aditivamente, preserva todos os dados pessoais e permite reimportação idêntica',async()=>withStore(engine,async({local})=>{
  await seed(local);const before=await local.exportState();const source=fixture('SOURCE');source.data.recipes[0].dose=21;const shared=(await buildLibrary(source.data,allLibrarySelection(source.data))).library;
  const archive=await createLibraryArchive(shared);const parsed=await parseArchive(archive.bytes,'library-share');if(parsed.kind!=='library-share')throw Error();
  const plan=await planLibraryImport(before.data,parsed.library);await local.mutateCollection({type:'importLibrary',plan});const after=await local.exportState();expect(canonical(personalPart(after.data))).toBe(canonical(personalPart(before.data)));expect((await normalizedState(after)).photos).toEqual((await normalizedState(before)).photos);expect(after.data.recipes.length).toBeGreaterThan(before.data.recipes.length);
  const repeated=await planLibraryImport(after.data,parsed.library);expect(repeated.additions).toEqual({methods:[],techniques:[],recipes:[]});await local.mutateCollection({type:'importLibrary',plan:repeated});expect(await normalizedState(await local.exportState())).toEqual(await normalizedState(after));
 }));
 it('recusa restauração com sessão atual e mantém os dados intactos',async()=>withStore(engine,async({local})=>{const source=fixture();await local.replaceState(source.data,source.photos,preferences);const before=await normalizedState(await local.exportState());await expect(local.replaceState(fixture('OTHER').data,source.photos,preferences)).rejects.toThrow();expect(await normalizedState(await local.exportState())).toEqual(before);}));
 it('reverte importação inteira diante de falha de gravação',async()=>withStore(engine,async({local,sql})=>{
  await seed(local);const before=await normalizedState(await local.exportState());const source=fixture();source.data.methods[0].description='Método diferente';const plan=await planLibraryImport(await local.loadCollection(),(await buildLibrary(source.data,allLibrarySelection(source.data))).library);
  let restore=()=>{};if(sql)sql.exec("CREATE TRIGGER fail_recipe BEFORE INSERT ON recipes BEGIN SELECT RAISE(ABORT,'Falha simulada'); END;");else{const orig=IDBObjectStore.prototype.put;const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['put']>){if(this.name==='recipes')throw Error('Falha simulada');return orig.apply(this,args);});restore=()=>spy.mockRestore();}
  try{await expect(local.mutateCollection({type:'importLibrary',plan})).rejects.toThrow('Falha simulada');}finally{restore();}expect(await normalizedState(await local.exportState())).toEqual(before);
 }));
 it('reverte substituição de registros, fotos e preferências se a transação falhar',async()=>withStore(engine,async({local,sql})=>{
  await seed(local);const before=await normalizedState(await local.exportState());const pending=await local.getMetadata(PENDING_PREFERENCES);const source=fixture('NEW');source.data.sessions=[];
  let restore=()=>{};if(sql)sql.exec("CREATE TRIGGER fail_reflection BEFORE INSERT ON reflections BEGIN SELECT RAISE(ABORT,'Falha simulada'); END;");else{const orig=IDBObjectStore.prototype.put;const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['put']>){if(this.name==='photos')throw Error('Falha simulada');return orig.apply(this,args);});restore=()=>spy.mockRestore();}
  try{await expect(local.replaceState(source.data,source.photos,{...preferences,textSize:85})).rejects.toThrow('Falha simulada');}finally{restore();}
  expect(await normalizedState(await local.exportState())).toEqual(before);expect(await local.getMetadata(PENDING_PREFERENCES)).toBe(pending);
 }));
});
it('prepara fotos sem sobrescrever a geração anterior e protege contra falha de disco ou leitura corrompida',async()=>withStore('sqlite',async({local,failWrite,corruptRead})=>{
 await seed(local);const before=await normalizedState(await local.exportState());const source=fixture('NEW');source.data.sessions=[];failWrite();await expect(local.replaceState(source.data,source.photos,preferences)).rejects.toThrow('fotografia');expect(await normalizedState(await local.exportState())).toEqual(before);corruptRead();await expect(local.replaceState(source.data,source.photos,preferences)).rejects.toThrow('preparar');
}));
it('recupera o diretório confirmado e limpa gerações interrompidas ao reabrir SQLite',async()=>withStore('sqlite',async({local,files})=>{
 await seed(local);const before=await normalizedState(await local.exportState());files.set(`photo-generations/${crypto.randomUUID()}/${crypto.randomUUID()}.jpg`,bytesToBase64(new Uint8Array([1,2,3])));await local.close();await validateStorage(local);expect(await normalizedState(await local.exportState())).toEqual(before);expect(new Set([...files.keys()].map(p=>p.split('/').slice(0,2).join('/'))).size).toBe(1);
}));
it('reconhece commit SQLite concluído mesmo se a resposta se perder',async()=>withStore('sqlite',async({local,sql})=>{
 await seed(local);native.commitTransaction.mockImplementationOnce(async()=>{sql!.exec('COMMIT');throw Error('Resposta perdida');});const source=fixture('NEW');source.data.sessions=[];await local.replaceState(source.data,source.photos,preferences);expect(canonical((await local.loadCollection()))).toBe(canonical(source.data));expect((await local.exportState()).photos).toHaveLength(6);
}));
it('bytes de imagens atravessam base64 sem conversão ou perda',()=>{const data=crypto.getRandomValues(new Uint8Array(60000));expect(base64ToBytes(bytesToBase64(data))).toEqual(data);});

describe.each(['indexeddb','sqlite'])('sessões preservadas ao importar em %s',engine=>{
 it('adiciona conteúdo sem modificar o checkpoint ativo',async()=>withStore(engine,async({local})=>{const target=fixture('TARGET');await local.replaceState(target.data,target.photos,preferences);const before=await local.exportState();const source=fixture('SOURCE');source.data.methods[0].notes='Outra configuração técnica';const plan=await planLibraryImport(before.data,(await buildLibrary(source.data,allLibrarySelection(source.data))).library);await local.mutateCollection({type:'importLibrary',plan});const after=await local.exportState();expect(canonical(personalPart(after.data))).toBe(canonical(personalPart(before.data)));expect(after.data.sessions[0]).toMatchObject({status:'paused',elapsedMs:45000});}));
});

describe.each([['sqlite','indexeddb'],['indexeddb','sqlite']])('portabilidade %s → %s', (from,to)=>{
 it('transporta integralmente o backup entre os dois adaptadores',async()=>withStore(from,async({local:origin})=>{
  await seed(origin,'CROSS');const original=await origin.exportState();const archive=await createPersonalArchive(original,preferences);
  await withStore(to,async({local:destination})=>{const parsed=await parseArchive(archive.bytes,'personal-full');if(parsed.kind!=='personal-full')throw Error();await destination.replaceState(parsed.data,parsed.photos,parsed.preferences);expect(await normalizedState(await destination.exportState())).toEqual(await normalizedState(original));});
 }));
});

describe.each(['indexeddb','sqlite'])('limpeza independente em %s', engine => {
 it('limpa dados pessoais, desvincula cafés e preserva todos os campos técnicos e preferências', async()=>withStore(engine, async({local})=>{
  await seed(local);const before=await local.exportState();const metadata=await local.getMetadata(PENDING_PREFERENCES);
  const orphan=crypto.randomUUID();await local.savePhoto(orphan,before.photos[0].blob);
  await local.mutateCollection({type:'clearData',scope:'personal'});await local.close();await validateStorage(local);
  const after=await local.exportState();expect(personalPart(after.data)).toEqual({coffees:[],records:[],packages:[],preparations:[],sessions:[],reflections:[]});
  expect(after.data.methods).toEqual(before.data.methods);expect(after.data.techniques).toEqual(before.data.techniques);
  expect(after.data.recipes).toEqual(before.data.recipes.map(r=>{const {coffeeId:_coffee,...rest}=r;return rest;}));
  expect(after.photos.map(p=>p.id).sort()).toEqual([before.data.methods[0].photoId,before.data.techniques[0].photoId].sort());
  expect(await local.readPhoto(orphan)).toBeUndefined();expect(await local.getMetadata(PENDING_PREFERENCES)).toBe(metadata);
  await parseArchive((await createPersonalArchive(after,preferences)).bytes,'personal-full');
  await local.mutateCollection({type:'clearData',scope:'personal'});expect(await normalizedState(await local.exportState())).toEqual(await normalizedState(after));
 }));
 it('limpa biblioteca e mídia sem vínculo, mantendo integralmente histórico, estoque e fotos históricas',async()=>withStore(engine,async({local})=>{
  await seed(local);const before=await local.exportState();const orphan=crypto.randomUUID();await local.savePhoto(orphan,before.photos[0].blob);
  await local.mutateCollection({type:'clearData',scope:'library'});await local.close();await validateStorage(local);const after=await local.exportState();
  expect(personalPart(after.data)).toEqual(personalPart(before.data));expect([after.data.methods,after.data.techniques,after.data.recipes]).toEqual([[],[],[]]);
  expect((await normalizedState(after)).photos).toEqual((await normalizedState(before)).photos);expect(await local.readPhoto(orphan)).toBeUndefined();
  await parseArchive((await createPersonalArchive(after,preferences)).bytes,'personal-full');
  await local.mutateCollection({type:'clearData',scope:'library'});expect(await normalizedState(await local.exportState())).toEqual(await normalizedState(after));
 }));
 it.each(['personal','library'] as const)('recusa limpar %s quando existe uma sessão',async scope=>withStore(engine,async({local})=>{
  const source=fixture();await local.replaceState(source.data,source.photos,preferences);const before=await normalizedState(await local.exportState());
  await expect(local.mutateCollection({type:'clearData',scope})).rejects.toThrow('preparo em andamento');expect(await normalizedState(await local.exportState())).toEqual(before);
 }));
 it.each(['personal','library'] as const)('reverte toda a limpeza %s quando uma exclusão falha',async scope=>withStore(engine,async({local,sql})=>{
  await seed(local);const before=await normalizedState(await local.exportState());let restore=()=>{};
  if(sql)sql.exec(`CREATE TRIGGER fail_clear BEFORE DELETE ON ${scope==='personal'?'coffees':'techniques'} BEGIN SELECT RAISE(ABORT,'Falha simulada'); END;`);
  else {const orig=IDBObjectStore.prototype.delete;const spy=vi.spyOn(IDBObjectStore.prototype,'delete').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['delete']>){if(this.name===(scope==='personal'?'coffees':'techniques'))throw Error('Falha simulada');return orig.apply(this,args);});restore=()=>spy.mockRestore();}
  try{await expect(local.mutateCollection({type:'clearData',scope})).rejects.toThrow('Falha simulada');}finally{restore();}
  expect(await normalizedState(await local.exportState())).toEqual(before);expect(await local.getMetadata('photo-prune-pending')).toBeUndefined();
 }));
});
it('retoma exclusão física pendente após falha de mídia no SQLite sem remover fotos mantidas',async()=>withStore('sqlite',async({local,files})=>{
 await seed(local);const before=await local.exportState();filesystem.deleteFile.mockRejectedValueOnce(Error('Falha de disco'));
 await expect(local.mutateCollection({type:'clearData',scope:'personal'})).rejects.toThrow('fotografias ainda aguardam');expect((await local.loadCollection()).coffees).toEqual([]);expect(await local.getMetadata('photo-prune-pending')).toBeTruthy();
 await local.close();await validateStorage(local);expect(await local.getMetadata('photo-prune-pending')).toBe('');expect(files.size).toBe(2);
 for(const id of [before.data.methods[0].photoId!,before.data.techniques[0].photoId!])expect(await local.readPhoto(id)).toBeDefined();
}));
it('reconhece resposta perdida após commit de limpeza SQLite e conclui a exclusão de mídia',async()=>withStore('sqlite',async({local,sql})=>{
 await seed(local);native.commitTransaction.mockImplementationOnce(async()=>{sql!.exec('COMMIT');throw Error('Resposta perdida');});
 await local.mutateCollection({type:'clearData',scope:'personal'});expect((await local.loadCollection()).coffees).toEqual([]);expect(await local.getMetadata('photo-prune-pending')).toBe('');expect((await local.exportState()).photos).toHaveLength(2);
}));
it('reverte registros e mídia juntos quando a exclusão de foto falha no IndexedDB',async()=>withStore('indexeddb',async({local})=>{
 await seed(local);const before=await normalizedState(await local.exportState());const original=IDBObjectStore.prototype.delete;
 const spy=vi.spyOn(IDBObjectStore.prototype,'delete').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['delete']>){if(this.name==='photos')throw Error('Falha de mídia');return original.apply(this,args);});
 try{await expect(local.mutateCollection({type:'clearData',scope:'personal'})).rejects.toThrow('Falha de mídia');}finally{spy.mockRestore();}expect(await normalizedState(await local.exportState())).toEqual(before);
}));

describe.each(['indexeddb','sqlite'])('fotografia e referência de receita em %s', engine => {
 it('persiste imagem única na família, substitui, remove e preserva dados pessoais e imagem histórica após reabrir', async()=>withStore(engine, async({local})=>{
  const state=await seed(local), original=canonical(personalPart((await local.exportState()).data));
  await saveRecipeWithPhoto(local,{...state.data.recipes[0],source:{id:'source',author:'Pessoa pública',url:'https://example.org/full?q=1#part'}},state.photos[0].blob);
  const first=await local.loadCollection(),old=first.recipes[0].photoId!;
  expect(first.recipes.map(r=>r.photoId)).toEqual([old,old]);
  // A historical snapshot keeps its own immutable photo identity.
  const stored=await local.exportState();stored.data.preparations[0].snapshot.recipe.photoId=old;
  await local.replaceState(stored.data,stored.photos,preferences);
  await saveRecipeWithPhoto(local,first.recipes[1],state.photos[1].blob);
  const replaced=await local.loadCollection();expect(replaced.recipes[0].photoId).not.toBe(old);expect(await local.readPhoto(old)).toBeDefined();
  const replacement=replaced.recipes[0].photoId!;
  await saveRecipeWithPhoto(local,replaced.recipes[1],null);
  await local.close();await validateStorage(local);
  const result=await local.exportState();expect(result.data.recipes.every(r=>!r.photoId)).toBe(true);expect(await local.readPhoto(replacement)).toBeUndefined();expect(await local.readPhoto(old)).toBeDefined();
  const personal=structuredClone(personalPart(result.data));delete personal.preparations[0].snapshot.recipe.photoId;
  expect(canonical(personal)).toBe(original);expect(result.data.recipes.find(r=>r.id===state.data.recipes[0].id)?.source?.author).toBe('Pessoa pública');expect(result.data.recipes).toHaveLength(2);
 }));
 it('restaura backup novo com foto de receita e compara dados e hashes integralmente',async()=>withStore(engine,async({local})=>{
  const source=fixture();source.data.sessions=[];const id=crypto.randomUUID();source.data.recipes.forEach(r=>{r.photoId=id;r.source={id:'source',author:'Apresentador',url:'http://example.org/r?a=1&b=2#time'};});source.photos.push({id,blob:source.photos[0].blob});
  const parsed=await parseArchive((await createPersonalArchive(source,preferences)).bytes,'personal-full');if(parsed.kind!=='personal-full')throw Error();await local.replaceState(parsed.data,parsed.photos,parsed.preferences);await local.close();await validateStorage(local);expect(await normalizedState(await local.exportState())).toEqual(await normalizedState(source));
 }));
 it('importa com foto preparada antes do commit, preserva destinatário e reimporta sem duplicar fotos',async()=>withStore(engine,async({local})=>{
  await seed(local);const before=await local.exportState(),source=fixture();source.data.recipes.forEach(r=>{r.photoId=source.photos[0].id;r.source={id:'source',author:'Referência nova'};});
  const prepared=await buildLibrary(source.data,allLibrarySelection(source.data),{includeImages:true,readPhoto:async id=>source.photos.find(p=>p.id===id)?.blob});
  const parsed=await parseArchive((await createLibraryArchive(prepared.library,prepared.photos)).bytes,'library-share');if(parsed.kind!=='library-share')throw Error();
  const plan=await planLibraryImport(before.data,parsed.library,parsed.photos);await mutateWithPhotos(local,{type:'importLibrary',plan},plan.photos);await local.close();await validateStorage(local);
  const after=await local.exportState();expect(canonical(personalPart(after.data))).toBe(canonical(personalPart(before.data)));expect(after.data.recipes.filter(r=>r.photoId)).toHaveLength(2);expect(after.photos).toHaveLength(7);
  const repeated=await planLibraryImport(after.data,parsed.library,parsed.photos);expect(repeated.photos).toEqual([]);await mutateWithPhotos(local,{type:'importLibrary',plan:repeated},repeated.photos);expect(await normalizedState(await local.exportState())).toEqual(await normalizedState(after));
 }));
 it('preenche foto ausente em família existente sem duplicar versões nem alterar referências',async()=>withStore(engine,async({local})=>{
  const source=await seed(local),before=await local.exportState();source.data.recipes.forEach(r=>{r.photoId=source.photos[0].id;});
  const prepared=await buildLibrary(source.data,allLibrarySelection(source.data),{includeImages:true,readPhoto:async()=>source.photos[0].blob});
  const plan=await planLibraryImport(before.data,prepared.library,prepared.photos);expect(plan.imageUpdates).toHaveLength(2);await mutateWithPhotos(local,{type:'importLibrary',plan},plan.photos);
  const after=await local.exportState();expect(after.data.recipes).toHaveLength(2);expect(after.data.recipes[0].photoId).toBeTruthy();expect(canonical(personalPart(after.data))).toBe(canonical(personalPart(before.data)));
 }));
 it('falha de banco após preparar foto não publica referência e libera apenas arquivos novos',async()=>withStore(engine,async({local,sql})=>{
  const source=await seed(local),before=await normalizedState(await local.exportState());let restore=()=>{};
  if(sql)sql.exec("CREATE TRIGGER fail_recipe_image BEFORE UPDATE ON recipes BEGIN SELECT RAISE(ABORT,'Falha simulada'); END;");
  else {const original=IDBObjectStore.prototype.put,spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['put']>){if(this.name==='recipes')throw Error('Falha simulada');return original.apply(this,args);});restore=()=>spy.mockRestore();}
  try{await expect(saveRecipeWithPhoto(local,source.data.recipes[0],source.photos[0].blob)).rejects.toThrow('Falha simulada');}finally{restore();}
  expect(await normalizedState(await local.exportState())).toEqual(before);
 }));
});
it('falha e corrupção da preparação de imagem recusam publicação SQLite',async()=>withStore('sqlite',async({local,failWrite,corruptRead})=>{
 const source=await seed(local),before=canonical(await local.loadCollection());failWrite();await expect(saveRecipeWithPhoto(local,source.data.recipes[0],source.photos[0].blob)).rejects.toThrow('fotografia');expect(canonical(await local.loadCollection())).toBe(before);
 corruptRead();await expect(saveRecipeWithPhoto(local,source.data.recipes[0],source.photos[0].blob)).rejects.toThrow('preparar');expect(canonical(await local.loadCollection())).toBe(before);
}));

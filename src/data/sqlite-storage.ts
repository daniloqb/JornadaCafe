import { PENDING_PREFERENCES, base64ToBytes, bytesToBase64, recoveredCollection, requiredPhotoIds, sha256, type ArchiveState, type PortablePreferences, type StoredPhoto } from '../transfer/core';
import { validateCollection, validatePreferences } from '../transfer/validation';
import type { CollectionTable } from '../domain/collection';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { LocalStorage } from '../domain/local-storage';
import { applyMutation, emptyCollection, collectionTables, collectionChanges, type CollectionData, type CollectionMutation } from '../domain/collection';
import { sqliteVersion2, sqliteVersion3, sqliteVersion4, sqliteVersion5 } from './sqlite-schema';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const DATABASE = 'minha_jornada_pelo_cafe';
const PHOTO_PRUNE_PENDING = 'photo-prune-pending';
const missingFile = (error: unknown) => /not exist|not found|ENOENT/i.test(String((error as {message?:string})?.message ?? error));

export class SQLiteStorage implements LocalStorage {
  readonly engine = 'sqlite';
  private readonly connections = new SQLiteConnection(CapacitorSQLite);
  private database?: SQLiteDBConnection;
  private photoRoot = 'photos';
  private operations: Promise<unknown> = Promise.resolve();

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operations.then(operation);
    this.operations = result.catch(() => undefined);
    return result;
  }

  async initialize(): Promise<void> {
    if (this.database) return;
    await this.connections.addUpgradeStatement(DATABASE, [{ toVersion: 2, statements: sqliteVersion2 }, { toVersion: 3, statements: sqliteVersion3 }, { toVersion: 4, statements: sqliteVersion4 }, { toVersion: 5, statements: sqliteVersion5 }]);
    const consistent = (await this.connections.checkConnectionsConsistency()).result;
    const exists = (await this.connections.isConnection(DATABASE, false)).result;
    const database = consistent && exists
      ? await this.connections.retrieveConnection(DATABASE, false)
      : await this.connections.createConnection(DATABASE, false, 'no-encryption', 5, false);
    try {
      await database.open();
      await database.execute('PRAGMA foreign_keys = ON;', false);
      // New databases start at user_version 5, so also install the schema on first creation.
      await database.execute([...sqliteVersion2, ...sqliteVersion3, ...sqliteVersion4, ...sqliteVersion5].join('\n'));
      this.database = database;
      const root = await this.getMetadata('photo-root');
      if (root && !/^photo-generations\/[a-f\d-]{36}$/i.test(root)) throw new Error('Diretório de fotografias inválido.');
      this.photoRoot = root || 'photos';
      if (await this.getMetadata(PHOTO_PRUNE_PENDING)) await this.prunePhotos(await this.readCollection());
      await this.cleanupPhotoGenerations().catch(() => undefined);
    } catch (error) {
      this.database = undefined;
      await this.connections.closeConnection(DATABASE, false).catch(() => undefined);
      throw error;
    }
  }

  async getMetadata(key: string): Promise<string | undefined> {
    if (!this.database) throw new Error('Armazenamento não inicializado.');
    const result = await this.database.query('SELECT value FROM metadata WHERE key = ?;', [key]);
    return result.values?.[0]?.value;
  }

  async setMetadata(key: string, value: string): Promise<void> {
    if (!this.database) throw new Error('Armazenamento não inicializado.');
    await this.database.run('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);', [key, value]);
  }

  async close(): Promise<void> {
    await this.connections.closeConnection(DATABASE, false);
    this.database = undefined;
  }

  private async readCollection(): Promise<CollectionData> {
    if (!this.database) throw new Error('Armazenamento não inicializado.');
    const data = emptyCollection();
    for (const table of collectionTables) {
      const result = await this.database.query(`SELECT payload FROM ${table};`);
      try { Object.assign(data, { [table]: (result.values ?? []).map(row => JSON.parse(row.payload)) }); }
      catch { throw new Error('Há um registro local inválido. Os dados não foram alterados.'); }
    }
    return data;
  }
  loadCollection(): Promise<CollectionData> { return this.serial(() => this.readCollection()); }

  mutateCollection(mutation: CollectionMutation): Promise<void> {
    return this.serial(async () => {
      const database = this.database;
      if (!database) throw new Error('Armazenamento não inicializado.');
      const pruneToken = mutation.type === 'clearData' ? crypto.randomUUID() : undefined;
      await database.beginTransaction();
      try {
        const data = await this.readCollection();
        const next = applyMutation(data, mutation);
        if (mutation.type === 'clearData') {
          if (mutation.scope === 'library') {
            for (const recipe of [...data.recipes].sort((a,b)=>b.version-a.version)) await database.run('DELETE FROM recipes WHERE id=?;', [recipe.id], false);
            await database.run('DELETE FROM techniques;', [], false);
            await database.run('DELETE FROM methods;', [], false);
          } else {
            for (const table of ['reflections','preparations','sessions','packages']) await database.run(`DELETE FROM ${table};`, [], false);
            for (const recipe of next.recipes.filter(r=>data.recipes.find(old=>old.id===r.id)?.coffeeId !== undefined)) await database.run('UPDATE recipes SET coffee_id=NULL,payload=? WHERE id=?;', [JSON.stringify(recipe),recipe.id], false);
            await database.run('DELETE FROM coffees;', [], false);
            await database.run('DELETE FROM records;', [], false);
          }
          await database.run('INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?);', [PHOTO_PRUNE_PENDING,pruneToken!], false);
        } else if (['reflection', 'deleteReflection', 'evaluatePreparation', 'startSession', 'checkpoint', 'discardSession', 'finishPreparation', 'correctPreparationParameters', 'deletePreparation'].includes(mutation.type)) {
          for (const change of collectionChanges(data, next)) {
            if (!change.value) await database.run(`DELETE FROM ${change.table} WHERE id = ?;`, [change.id], false);
            else if (change.table === 'packages') {
              const packet = next.packages.find(p => p.id === change.id)!;
              await database.run('UPDATE packages SET remaining_weight=?,payload=? WHERE id=?;', [packet.remainingWeight, JSON.stringify(packet), packet.id], false);
            } else await database.run(`INSERT INTO ${change.table} (id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;`, [change.id, JSON.stringify(change.value)], false);
          }
        } else if (mutation.type === 'importLibrary' || mutation.type === 'importReference' || mutation.type === 'importReferenceCatalog') {
          // Dependency order comes from collectionTables: methods, techniques, then recipes.
          for (const change of collectionChanges(data, next)) {
            if (change.table === 'methods') {
              const value = next.methods.find(v => v.id === change.id)!;
              await database.run('INSERT INTO methods (id,payload) VALUES (?,?);', [value.id, JSON.stringify(value)], false);
            } else if (change.table === 'techniques') {
              const value = next.techniques.find(v => v.id === change.id)!;
              await database.run('INSERT INTO techniques (id,method_id,payload) VALUES (?,?,?);', [value.id, value.methodId ?? null, JSON.stringify(value)], false);
            } else if (change.table === 'recipes') {
              const value = next.recipes.find(v => v.id === change.id)!;
              await database.run('INSERT INTO recipes (id,family_id,version,previous_id,method_id,technique_id,coffee_id,payload) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;', [value.id, value.familyId, value.version, value.previousVersionId ?? null, value.methodId, value.techniqueId ?? null, value.coffeeId ?? null, JSON.stringify(value)], false);
            }
          }
        } else if (mutation.type === 'deleteCoffee') {
          await database.run('DELETE FROM packages WHERE coffee_id = ?;', [mutation.id], false);
          await database.run('DELETE FROM coffees WHERE id = ?;', [mutation.id], false);
        } else if (mutation.type === 'deleteRecord') await database.run('DELETE FROM records WHERE id = ?;', [mutation.id], false);
        else if (mutation.type === 'record') {
          const record = next.records.find(r => r.id === mutation.value.id)!;
          await database.run('INSERT INTO records (id,kind,payload) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;', [record.id, record.kind, JSON.stringify(record)], false);
        } else if (mutation.type === 'coffee') {
          // Selected offline options are stored atomically with the coffee.
          for (const change of collectionChanges(data, next).filter(c => c.table === 'records' && c.value)) {
            const record = next.records.find(r => r.id === change.id)!;
            await database.run('INSERT INTO records (id,kind,payload) VALUES (?,?,?);', [record.id, record.kind, JSON.stringify(record)], false);
          }
          const coffee = next.coffees.find(c => c.id === mutation.value.id)!;
          await database.run('INSERT INTO coffees (id,producer_id,property_id,origin_id,roaster_id,payload) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET producer_id=excluded.producer_id,property_id=excluded.property_id,origin_id=excluded.origin_id,roaster_id=excluded.roaster_id,payload=excluded.payload;', [coffee.id, coffee.producerId ?? null, coffee.propertyId ?? null, coffee.originId ?? null, coffee.roasterId ?? null, JSON.stringify(coffee)], false);
        } else if (mutation.type === 'package') {
          const packet = next.packages.find(p => p.id === mutation.value.id)!;
          await database.run('INSERT INTO packages (id,coffee_id,initial_weight,remaining_weight,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET initial_weight=excluded.initial_weight,remaining_weight=excluded.remaining_weight,payload=excluded.payload;', [packet.id, packet.coffeeId, packet.initialWeight, packet.remainingWeight, JSON.stringify(packet)], false);
        } else if (mutation.type === 'method') {
          const value = next.methods.find(v => v.id === mutation.value.id)!;
          await database.run('INSERT INTO methods (id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;', [value.id, JSON.stringify(value)], false);
        } else if (mutation.type === 'technique') {
          const value = next.techniques.find(v => v.id === mutation.value.id)!;
          await database.run('INSERT INTO techniques (id,method_id,payload) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET method_id=excluded.method_id,payload=excluded.payload;', [value.id, value.methodId ?? null, JSON.stringify(value)], false);
        } else if (mutation.type === 'recipe') {
          for (const change of collectionChanges(data, next).filter(c => c.table === 'recipes' && c.value)) {
            const value = next.recipes.find(v => v.id === change.id)!;
            await database.run('INSERT INTO recipes (id,family_id,version,previous_id,method_id,technique_id,coffee_id,payload) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET method_id=excluded.method_id,technique_id=excluded.technique_id,coffee_id=excluded.coffee_id,payload=excluded.payload;', [value.id, value.familyId, value.version, value.previousVersionId ?? null, value.methodId, value.techniqueId ?? null, value.coffeeId ?? null, JSON.stringify(value)], false);
          }
        } else if (mutation.type === 'deleteMethod' || mutation.type === 'deleteTechnique' || mutation.type === 'deleteRecipe') {
          const table = mutation.type === 'deleteMethod' ? 'methods' : mutation.type === 'deleteTechnique' ? 'techniques' : 'recipes';
          await database.run(`DELETE FROM ${table} WHERE id = ?;`, [mutation.id], false);
        }

        await database.commitTransaction();
      } catch (error) {
        await database.rollbackTransaction().catch(() => undefined);
        if (!pruneToken || await this.getMetadata(PHOTO_PRUNE_PENDING).catch(()=>undefined) !== pruneToken) throw error;
      }
      if (pruneToken) await this.prunePhotos(await this.readCollection());
    });
  }

  private async cleanupPhotoGenerations(strict = false){
    const listing=await Filesystem.readdir({path:'photo-generations',directory:Directory.Data}).catch(error=>{if(strict&&!missingFile(error))throw error;return {files:[]};});
    for(const entry of listing.files){if(!/^[a-f\d-]{36}$/i.test(entry.name))continue;const path=`photo-generations/${entry.name}`;if(path!==this.photoRoot)await Filesystem.rmdir({path,directory:Directory.Data,recursive:true});}
    if(this.photoRoot!=='photos')await Filesystem.rmdir({path:'photos',directory:Directory.Data,recursive:true}).catch(error=>{if(strict&&!missingFile(error))throw error;});
  }
  private async prunePhotos(data:CollectionData){
    try {
      const retained = new Set(requiredPhotoIds(data));
      const listing = await Filesystem.readdir({path:this.photoRoot,directory:Directory.Data}).catch(error=>{if(!missingFile(error))throw error;return {files:[]};});
      for (const file of listing.files) {
        if (!/^[a-f\d-]{36}\.jpg$/i.test(file.name)) continue;
        if (!retained.has(file.name.slice(0,-4))) await Filesystem.deleteFile({path:`${this.photoRoot}/${file.name}`,directory:Directory.Data});
      }
      await this.cleanupPhotoGenerations(true);
      await this.setMetadata(PHOTO_PRUNE_PENDING,'');
    } catch { throw new Error('Os registros foram limpos, mas algumas fotografias ainda aguardam exclusão. Tente limpar novamente ou reabra o aplicativo para concluir.'); }
  }
  private async insertRow(table:CollectionTable,row:CollectionData[CollectionTable][number]){
    const db=this.database!;const payload=JSON.stringify(row);
    if(table==='records') {const r=row as CollectionData['records'][number];await db.run('INSERT INTO records(id,kind,payload) VALUES(?,?,?);',[r.id,r.kind,payload],false);}
    else if(table==='coffees'){const r=row as CollectionData['coffees'][number];await db.run('INSERT INTO coffees(id,producer_id,property_id,origin_id,roaster_id,payload) VALUES(?,?,?,?,?,?);',[r.id,r.producerId??null,r.propertyId??null,r.originId??null,r.roasterId??null,payload],false);}
    else if(table==='packages'){const r=row as CollectionData['packages'][number];await db.run('INSERT INTO packages(id,coffee_id,initial_weight,remaining_weight,payload) VALUES(?,?,?,?,?);',[r.id,r.coffeeId,r.initialWeight,r.remainingWeight,payload],false);}
    else if(table==='techniques'){const r=row as CollectionData['techniques'][number];await db.run('INSERT INTO techniques(id,method_id,payload) VALUES(?,?,?);',[r.id,r.methodId??null,payload],false);}
    else if(table==='recipes'){const r=row as CollectionData['recipes'][number];await db.run('INSERT INTO recipes(id,family_id,version,previous_id,method_id,technique_id,coffee_id,payload) VALUES(?,?,?,?,?,?,?,?);',[r.id,r.familyId,r.version,r.previousVersionId??null,r.methodId,r.techniqueId??null,r.coffeeId??null,payload],false);}
    else await db.run(`INSERT INTO ${table}(id,payload) VALUES(?,?);`,[row.id,payload],false);
  }
  exportState():Promise<ArchiveState>{return this.serial(async()=>{
    const data=await this.readCollection();const photos:StoredPhoto[]=[];
    for(const id of requiredPhotoIds(data)){const blob=await this.readPhotoAt(id,this.photoRoot);if(blob)photos.push({id,blob});}
    return {data,photos};
  });}
  replaceState(data:CollectionData,photos:StoredPhoto[],preferences:PortablePreferences):Promise<void>{return this.serial(async()=>{
    validateCollection(data);validatePreferences(preferences);
    if(new Set(photos.map(p=>p.id)).size!==photos.length||requiredPhotoIds(data).some(id=>!photos.some(p=>p.id===id)))throw new Error('Fotografias ausentes ou duplicadas.');
    if(!this.database)throw new Error('Armazenamento não inicializado.');
    const before=await this.readCollection();if(before.sessions.length)throw new Error('Conclua ou descarte o preparo em andamento antes de restaurar.');
    const generation=`photo-generations/${crypto.randomUUID()}`;
    // Stage and verify NEW files. Never overwrite the generation referenced by the current DB.
    for(const photo of photos){const bytes=new Uint8Array(await photo.blob.arrayBuffer());await Filesystem.writeFile({path:this.photoPath(photo.id,generation),directory:Directory.Data,data:bytesToBase64(bytes),recursive:true});const read=await this.readPhotoAt(photo.id,generation);if(!read||await sha256(new Uint8Array(await read.arrayBuffer()))!==await sha256(bytes))throw new Error('Falha ao preparar as fotografias. A coleção anterior foi mantida.');}
    const restored=recoveredCollection(data);const db=this.database;
    await db.beginTransaction();
    try{
      for(const table of ['reflections','preparations','sessions'] as const)await db.run(`DELETE FROM ${table};`,[],false);
      for(const r of [...before.recipes].sort((a,b)=>b.version-a.version))await db.run('DELETE FROM recipes WHERE id=?;',[r.id],false);
      for(const table of ['techniques','methods','packages','coffees','records'] as const)await db.run(`DELETE FROM ${table};`,[],false);
      for(const table of ['records','coffees','packages','methods','techniques','recipes','preparations','sessions','reflections'] as const){const rows=table==='recipes'?[...restored.recipes].sort((a,b)=>a.version-b.version):restored[table];for(const row of rows)await this.insertRow(table,row);}
      for(const [key,value]of [['photo-root',generation],[PENDING_PREFERENCES,JSON.stringify(preferences)]])await db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?);',[key,value],false);
      await db.commitTransaction();this.photoRoot=generation;
    }catch(error){await db.rollbackTransaction().catch(()=>undefined);if(await this.getMetadata('photo-root').catch(()=>undefined)===generation){this.photoRoot=generation;return;}throw error;}
    // Superseded/staged generations are retained until successful startup cleanup. A crash is harmless:
    // the committed metadata pointer always identifies a complete generation.
  });}
  private photoPath(id:string,root=this.photoRoot){if(!/^[a-f\d-]{36}$/i.test(id))throw new Error('Referência de fotografia inválida.');return `${root}/${id}.jpg`;}
  private async readPhotoAt(id:string,root:string):Promise<Blob|undefined>{
    try{const result=await Filesystem.readFile({path:this.photoPath(id,root),directory:Directory.Data});return typeof result.data==='string'?new Blob([base64ToBytes(result.data).buffer as ArrayBuffer]):result.data;}
    catch(error){
      // Missing images are reported by archive generation; other I/O failures must not create a valid backup.
      if(error instanceof Error && !/not exist|not found|ENOENT/i.test(error.message))throw error;
      return undefined;
    }
  }
  readPhoto(id:string):Promise<Blob|undefined>{return this.serial(()=>this.readPhotoAt(id,this.photoRoot));}
  savePhoto(id:string,blob:Blob):Promise<void>{return this.serial(async()=>{await Filesystem.writeFile({path:this.photoPath(id),directory:Directory.Data,data:bytesToBase64(new Uint8Array(await blob.arrayBuffer())),recursive:true});});}
  async photoUrl(id:string):Promise<string|undefined>{try{const path=this.photoPath(id);await Filesystem.stat({path,directory:Directory.Data});const {uri}=await Filesystem.getUri({path,directory:Directory.Data});return Capacitor.convertFileSrc(uri);}catch{return undefined;}}
  deletePhoto(id:string):Promise<void>{return this.serial(async()=>{await Filesystem.deleteFile({path:this.photoPath(id),directory:Directory.Data});});}
}

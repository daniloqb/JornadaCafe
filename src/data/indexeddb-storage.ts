import { PENDING_PREFERENCES, recoveredCollection, requiredPhotoIds, type ArchiveState, type PortablePreferences, type StoredPhoto } from '../transfer/core';
import { validateCollection, validatePreferences } from '../transfer/validation';
import type { LocalStorage } from '../domain/local-storage';
import { applyMutation, emptyCollection, collectionTables, collectionChanges, type CollectionData, type CollectionMutation } from '../domain/collection';

export class IndexedDBStorage implements LocalStorage {
  readonly engine = 'indexeddb';
  private database?: IDBDatabase;

  constructor(private readonly name = 'minha-jornada-pelo-cafe') {}

  async initialize(): Promise<void> {
    if (this.database) return;
    if (!globalThis.indexedDB) throw new Error('Este navegador não disponibiliza o IndexedDB.');

    this.database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.name, 5);
      let settled = false;
      const fail = (error: unknown) => {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      };
      const timeout = setTimeout(() => fail(new Error('O armazenamento demorou para responder.')), 10_000);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('metadata')) {
          request.result.createObjectStore('metadata');
        }
        for (const name of [...collectionTables, 'photos']) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: 'id' });
        }
        const metadata = request.transaction!.objectStore('metadata');
        const version = metadata.get('schema-version');
        version.onsuccess = () => {
          if (version.result !== undefined && version.result !== '1' && version.result !== '2' && version.result !== '3' && version.result !== '4') { request.transaction!.abort(); return; }
          metadata.put('5', 'schema-version');
        };
      };
      request.onblocked = () => fail(new Error('Feche outras abas deste aplicativo e tente novamente.'));
      request.onerror = () => fail(request.error ?? new Error('Falha ao abrir o armazenamento.'));
      request.onsuccess = () => {
        clearTimeout(timeout);
        if (settled) { request.result.close(); return; }
        settled = true;
        const database = request.result;
        database.onversionchange = () => { database.close(); this.database = undefined; };
        database.onclose = () => { this.database = undefined; };
        resolve(database);
      };
    });
  }

  private metadata<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = this.database;
    if (!database) return Promise.reject(new Error('Armazenamento não inicializado.'));
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('metadata', mode);
      const request = operation(transaction.objectStore('metadata'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? request.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Operação local interrompida.'));
    });
  }

  async getMetadata(key: string): Promise<string | undefined> {
    return this.metadata('readonly', (store) => store.get(key));
  }

  async setMetadata(key: string, value: string): Promise<void> {
    await this.metadata('readwrite', (store) => store.put(value, key));
  }

  async close(): Promise<void> {
    this.database?.close();
    this.database = undefined;
  }

  async loadCollection(): Promise<CollectionData> {
    return this.collectionTransaction();
  }

  async mutateCollection(mutation: CollectionMutation): Promise<void> {
    await this.collectionTransaction(mutation);
  }

  private collectionTransaction(mutation?: CollectionMutation): Promise<CollectionData> {
    if (!this.database) return Promise.reject(new Error('Armazenamento não inicializado.'));
    return new Promise((resolve, reject) => {
      const transaction = this.database!.transaction(mutation?.type === 'clearData' ? [...collectionTables, 'photos'] : [...collectionTables], mutation ? 'readwrite' : 'readonly');
      const data = emptyCollection();
      let pending = collectionTables.length;
      let failure: unknown;
      for (const name of collectionTables) {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => {
          Object.assign(data, { [name]: request.result });
          if (--pending || !mutation) return;
          try {
            const next = applyMutation(data, mutation);
            for (const change of collectionChanges(data, next)) {
              const store = transaction.objectStore(change.table);
              if (change.value) store.put(change.value); else store.delete(change.id);
            }
            if (mutation.type === 'clearData') {
              const retained = new Set(requiredPhotoIds(next));
              const photos = transaction.objectStore('photos');
              const keys = photos.getAllKeys();
              keys.onsuccess = () => {
                try { for (const id of keys.result) if (!retained.has(String(id))) photos.delete(id); }
                catch (error) { failure = error; transaction.abort(); }
              };
            }
          } catch (error) { failure = error; transaction.abort(); }
        };
      }
      transaction.oncomplete = () => resolve(data);
      transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('Falha ao ler a coleção.'));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Não foi possível salvar a coleção.'));
    });
  }

  async exportState(): Promise<ArchiveState> {
    if (!this.database) throw new Error('Armazenamento não inicializado.');
    return new Promise((resolve,reject) => {
      const tx=this.database!.transaction([...collectionTables,'photos'],'readonly');
      const data=emptyCollection();let photos:StoredPhoto[]=[];
      for(const table of collectionTables){const r=tx.objectStore(table).getAll();r.onsuccess=()=>Object.assign(data,{[table]:r.result});}
      const r=tx.objectStore('photos').getAll();r.onsuccess=()=>{photos=r.result;};
      tx.oncomplete=()=>{const ids=new Set(requiredPhotoIds(data));resolve({data,photos:photos.filter(p=>ids.has(p.id))});};
      tx.onerror=tx.onabort=()=>reject(tx.error??new Error('Não foi possível ler os dados para o backup.'));
    });
  }
  async replaceState(data:CollectionData,photos:StoredPhoto[],preferences:PortablePreferences):Promise<void>{
    validateCollection(data);validatePreferences(preferences);
    if(new Set(photos.map(p=>p.id)).size!==photos.length||requiredPhotoIds(data).some(id=>!photos.some(p=>p.id===id)))throw new Error('Fotografias ausentes ou duplicadas.');
    if(!this.database)throw new Error('Armazenamento não inicializado.');
    const restored=recoveredCollection(data);
    return new Promise((resolve,reject)=>{
      const tx=this.database!.transaction([...collectionTables,'photos','metadata'],'readwrite');let failure:unknown;
      const sessions=tx.objectStore('sessions').getAll();sessions.onsuccess=()=>{
        try{
          if(sessions.result.length)throw new Error('Conclua ou descarte o preparo em andamento antes de restaurar.');
          for(const table of collectionTables){const store=tx.objectStore(table);store.clear();for(const row of restored[table])store.put(row);}
          const store=tx.objectStore('photos');store.clear();for(const photo of photos)store.put(photo);
          tx.objectStore('metadata').put(JSON.stringify(preferences),PENDING_PREFERENCES);
        }catch(error){failure=error;tx.abort();}
      };
      tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(failure??tx.error??new Error('A restauração foi revertida.'));
    });
  }
  async readPhoto(id:string):Promise<Blob|undefined>{return (await this.photoOperation<StoredPhoto|undefined>('readonly',store=>store.get(id)))?.blob;}

  private photoOperation<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    if (!this.database) return Promise.reject(new Error('Armazenamento não inicializado.'));
    return new Promise((resolve, reject) => {
      const transaction = this.database!.transaction('photos', mode);
      const request = operation(transaction.objectStore('photos'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? request.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Falha ao armazenar a fotografia.'));
    });
  }
  async savePhoto(id: string, blob: Blob): Promise<void> { await this.photoOperation('readwrite', store => store.put({ id, blob })); }
  async photoUrl(id: string): Promise<string | undefined> {
    const photo = await this.photoOperation<{ id: string; blob: Blob } | undefined>('readonly', store => store.get(id));
    return photo?.blob ? URL.createObjectURL(photo.blob) : undefined;
  }
  async deletePhoto(id: string): Promise<void> { await this.photoOperation('readwrite', store => store.delete(id)); }
}

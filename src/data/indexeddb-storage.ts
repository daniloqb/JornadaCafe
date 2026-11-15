import type { LocalStorage } from '../domain/local-storage';

export class IndexedDBStorage implements LocalStorage {
  readonly engine = 'indexeddb';
  private database?: IDBDatabase;

  constructor(private readonly name = 'minha-jornada-pelo-cafe') {}

  async initialize(): Promise<void> {
    if (this.database) return;
    if (!globalThis.indexedDB) throw new Error('Este navegador não disponibiliza o IndexedDB.');

    this.database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
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
}

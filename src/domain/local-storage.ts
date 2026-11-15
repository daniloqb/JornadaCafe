import type { CollectionData, CollectionMutation } from './collection';

export interface LocalStorage {
  readonly engine: 'indexeddb' | 'sqlite';
  initialize(): Promise<void>;
  getMetadata(key: string): Promise<string | undefined>;
  setMetadata(key: string, value: string): Promise<void>;
  close(): Promise<void>;
  loadCollection(): Promise<CollectionData>;
  mutateCollection(mutation: CollectionMutation): Promise<void>;
  savePhoto(id: string, blob: Blob): Promise<void>;
  photoUrl(id: string): Promise<string | undefined>;
  deletePhoto(id: string): Promise<void>;
}

export async function validateStorage(storage: LocalStorage): Promise<void> {
  await storage.initialize();
  const version = await storage.getMetadata('schema-version');
  if (version !== '3') {
    throw new Error('Esta versão do armazenamento não é compatível com o aplicativo.');
  }
  await storage.setMetadata('schema-version', '3');
  if (await storage.getMetadata('schema-version') !== '3') {
    throw new Error('Não foi possível verificar o armazenamento local.');
  }
}

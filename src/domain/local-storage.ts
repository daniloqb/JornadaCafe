/** Only infrastructure metadata exists in Phase 01. No collection data is seeded. */
export interface LocalStorage {
  readonly engine: 'indexeddb' | 'sqlite';
  initialize(): Promise<void>;
  getMetadata(key: string): Promise<string | undefined>;
  setMetadata(key: string, value: string): Promise<void>;
  close(): Promise<void>;
}

export async function validateStorage(storage: LocalStorage): Promise<void> {
  await storage.initialize();
  const version = await storage.getMetadata('schema-version');
  if (version !== undefined && version !== '1') {
    throw new Error('Esta versão do armazenamento não é compatível com o aplicativo.');
  }
  await storage.setMetadata('schema-version', '1');
  if (await storage.getMetadata('schema-version') !== '1') {
    throw new Error('Não foi possível verificar o armazenamento local.');
  }
}

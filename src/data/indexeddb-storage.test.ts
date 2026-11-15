import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { IndexedDBStorage } from './indexeddb-storage';
import { validateStorage } from '../domain/local-storage';

describe('armazenamento local', () => {
  it('valida escrita e leitura e preserva metadados ao reabrir a base', async () => {
    const name = `jornada-${crypto.randomUUID()}`;
    const first = new IndexedDBStorage(name);
    await validateStorage(first);
    await first.setMetadata('test-value', 'persistido');
    await first.close();
    const reopened = new IndexedDBStorage(name);
    await validateStorage(reopened);
    expect(await reopened.getMetadata('schema-version')).toBe('3');
    expect(await reopened.getMetadata('test-value')).toBe('persistido');
    await reopened.close();
    indexedDB.deleteDatabase(name);
  });

  it('recusa uma versão futura sem sobrescrever os metadados', async () => {
    const name = `jornada-${crypto.randomUUID()}`;
    const storage = new IndexedDBStorage(name);
    await storage.initialize();
    await storage.setMetadata('schema-version', '4');
    await expect(validateStorage(storage)).rejects.toThrow('não é compatível');
    expect(await storage.getMetadata('schema-version')).toBe('4');
    await storage.close();
    indexedDB.deleteDatabase(name);
  });

  it('informa indisponibilidade sem recorrer a armazenamento em memória', async () => {
    vi.stubGlobal('indexedDB', undefined);
    try {
      await expect(validateStorage(new IndexedDBStorage())).rejects.toThrow('não disponibiliza o IndexedDB');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

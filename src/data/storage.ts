import { recoverPreferences } from '../transfer/preferences';
import { Capacitor } from '@capacitor/core';
import { validateStorage, type LocalStorage } from '../domain/local-storage';
import { IndexedDBStorage } from './indexeddb-storage';

let initialization: Promise<LocalStorage> | undefined;

export function initializeStorage(): Promise<LocalStorage> {
  // Share initialization across React StrictMode effects and allow retries after failure.
  initialization ??= (async () => {
    const storage: LocalStorage = Capacitor.getPlatform() === 'android'
      ? new (await import('./sqlite-storage')).SQLiteStorage()
      : new IndexedDBStorage();
    try {
      await validateStorage(storage);
      await recoverPreferences(storage);
      return storage;
    } catch (error) {
      await storage.close().catch(() => undefined);
      throw error;
    }
  })().catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

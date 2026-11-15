import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { emptyCollection, type Coffee, type CollectionData, type CollectionMutation } from '../domain/collection';
import type { LocalStorage } from '../domain/local-storage';
import { initializeStorage } from './storage';

interface CollectionContextValue {
  data: CollectionData; storage?: LocalStorage; loading: boolean; error?: string; warning?: string;
  retry: () => void; mutate: (mutation: CollectionMutation) => Promise<void>;
  saveCoffee: (coffee: Coffee, photo?: Blob | null) => Promise<void>;
  deleteCoffee: (id: string) => Promise<void>;
}
const CollectionContext = createContext<CollectionContextValue | null>(null);
export function useCollection() { const value = useContext(CollectionContext); if (!value) throw new Error('Coleção indisponível.'); return value; }
export function CollectionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CollectionData>(emptyCollection);
  const [storage, setStorage] = useState<LocalStorage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(async (local: LocalStorage) => { setData(await local.loadCollection()); }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(undefined);
    initializeStorage().then(async local => {
      const loaded = await local.loadCollection();
      if (!cancelled) { setStorage(local); setData(loaded); setLoading(false); }
    }).catch((reason: unknown) => { if (!cancelled) { setError(reason instanceof Error ? reason.message : 'Falha ao carregar a coleção.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    const handleFocus = () => { if (storage) void refresh(storage).catch(() => setError('Não foi possível atualizar a coleção. Tente novamente.')); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [storage, refresh]);
  async function mutate(mutation: CollectionMutation) {
    if (!storage || error) throw new Error('O armazenamento não está disponível. Tente inicializar novamente.');
    await storage.mutateCollection(mutation);
    // Once committed, a refresh failure must not be mistaken for a failed save (or remove its photo).
    try { await refresh(storage); }
    catch { setError('A alteração foi salva, mas a coleção não pôde ser recarregada. Tente novamente.'); }
  }
  async function cleanPhoto(id?: string) {
    if (!id || !storage) return;
    try { await storage.deletePhoto(id); }
    catch { setWarning('O registro foi salvo, mas uma fotografia antiga não pôde ser removida do armazenamento.'); }
  }
  async function saveCoffee(coffee: Coffee, photo?: Blob | null) {
    if (!storage) throw new Error('Armazenamento indisponível.');
    const oldPhoto = data.coffees.find(c => c.id === coffee.id)?.photoId;
    const photoId = photo ? crypto.randomUUID() : photo === null ? undefined : coffee.photoId;
    if (photo && photoId) await storage.savePhoto(photoId, photo);
    try { await mutate({ type: 'coffee', value: { ...coffee, photoId } }); }
    catch (reason) { if (photo && photoId) await cleanPhoto(photoId); throw reason; }
    if (oldPhoto && oldPhoto !== photoId) await cleanPhoto(oldPhoto);
  }
  async function deleteCoffee(id: string) {
    const photoId = data.coffees.find(c => c.id === id)?.photoId;
    await mutate({ type: 'deleteCoffee', id });
    await cleanPhoto(photoId);
  }
  return <CollectionContext.Provider value={{ data, storage, loading, error, warning, retry: () => setAttempt(v => v + 1), mutate, saveCoffee, deleteCoffee }}>{children}</CollectionContext.Provider>;
}

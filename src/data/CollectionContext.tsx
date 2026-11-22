import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { emptyCollection, type Coffee, type CollectionData, type CollectionMutation, type RelatedRecord } from '../domain/collection';
import type { BrewMethod, BrewTechnique, BrewRecipe } from '../domain/brewing';
import type { LibraryImportPlan } from '../transfer/library';
import { mutateWithPhotos, saveRecipeWithPhoto } from './media-mutation';
import type { LocalStorage } from '../domain/local-storage';
import { initializeStorage } from './storage';
import { photoIsReferenced } from '../domain/photo-references';

interface CollectionContextValue {
  data: CollectionData; storage?: LocalStorage; loading: boolean; error?: string; warning?: string;
  retry: () => void; mutate: (mutation: CollectionMutation) => Promise<void>;
  saveCoffee: (coffee: Coffee, photo?: Blob | null) => Promise<void>;
  deleteCoffee: (id: string) => Promise<void>;
  saveMethod: (method: BrewMethod, photo?: Blob | null) => Promise<void>;
  deleteMethod: (id: string) => Promise<void>;
  saveTechnique: (technique: BrewTechnique, photo?: Blob | null) => Promise<void>;
  deleteTechnique: (id: string) => Promise<void>;
  saveRecipe: (recipe: BrewRecipe, photo?: Blob | null, fromId?: string) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  importLibrary: (plan: LibraryImportPlan) => Promise<void>;
  saveRecord: (record: RelatedRecord, photo?: Blob | null) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
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
    try { await storage.mutateCollection(mutation); }
    catch (reason) {
      // SQLite media cleanup can fail after the record transaction committed.
      if (mutation.type === 'clearData') await refresh(storage).catch(() => setError('Não foi possível recarregar a coleção. Tente novamente.'));
      throw reason;
    }
    // Once committed, a refresh failure must not be mistaken for a failed save (or remove its photo).
    try { await refresh(storage); }
    catch { setError('A alteração foi salva, mas a coleção não pôde ser recarregada. Tente novamente.'); }
  }
  async function cleanPhoto(id?: string) {
    if (!id || !storage) return;
    try {
      if (!photoIsReferenced(await storage.loadCollection(), id)) await storage.deletePhoto(id);
    }
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
  async function saveMethod(method: BrewMethod, photo?: Blob | null) {
    if (!storage) throw new Error('Armazenamento indisponível.');
    const oldPhoto = data.methods.find(m => m.id === method.id)?.photoId;
    const photoId = photo ? crypto.randomUUID() : photo === null ? undefined : method.photoId;
    if (photo && photoId) await storage.savePhoto(photoId, photo);
    try { await mutate({ type: 'method', value: { ...method, photoId } }); }
    catch (reason) { if (photo && photoId) await cleanPhoto(photoId); throw reason; }
    if (oldPhoto && oldPhoto !== photoId) await cleanPhoto(oldPhoto);
  }
  async function deleteMethod(id: string) {
    const photoId = data.methods.find(m => m.id === id)?.photoId;
    await mutate({ type: 'deleteMethod', id }); await cleanPhoto(photoId);
  }
  async function saveTechnique(technique: BrewTechnique, photo?: Blob | null) {
    if (!storage) throw new Error('Armazenamento indisponível.');
    const oldPhoto = data.techniques.find(m => m.id === technique.id)?.photoId;
    const photoId = photo ? crypto.randomUUID() : photo === null ? undefined : technique.photoId;
    if (photo && photoId) await storage.savePhoto(photoId, photo);
    try { await mutate({ type: 'technique', value: { ...technique, photoId } }); }
    catch (reason) { if (photo && photoId) await cleanPhoto(photoId); throw reason; }
    if (oldPhoto && oldPhoto !== photoId) await cleanPhoto(oldPhoto);
  }
  async function deleteTechnique(id: string) {
    const photoId = data.techniques.find(m => m.id === id)?.photoId;
    await mutate({ type: 'deleteTechnique', id }); await cleanPhoto(photoId);
  }
  async function refreshSaved() {
    if (!storage) return;
    try { await refresh(storage); }
    catch { setError('A alteração foi salva, mas a coleção não pôde ser recarregada. Tente novamente.'); }
  }
  async function saveRecipe(recipe: BrewRecipe, photo?: Blob | null, fromId?: string) {
    if (!storage || error) throw new Error('Armazenamento indisponível.');
    await saveRecipeWithPhoto(storage, recipe, photo, fromId);
    await refreshSaved();
  }
  async function deleteRecipe(id: string) {
    const photoId = data.recipes.find(r => r.id === id)?.photoId;
    await mutate({ type: 'deleteRecipe', id });
    await cleanPhoto(photoId);
  }
  async function importLibrary(plan: LibraryImportPlan) {
    if (!storage || error) throw new Error('Armazenamento indisponível.');
    await mutateWithPhotos(storage, { type: 'importLibrary', plan }, plan.photos);
    await refreshSaved();
  }
  async function saveRecord(record: RelatedRecord, photo?: Blob | null) {
    if (!storage) throw new Error('Armazenamento indisponível.');
    const oldPhoto = data.records.find(r => r.id === record.id)?.photoId;
    const photoId = photo ? crypto.randomUUID() : photo === null ? undefined : record.photoId;
    if (photo && photoId) await storage.savePhoto(photoId, photo);
    try { await mutate({ type: 'record', value: { ...record, photoId } }); }
    catch (reason) { if (photo && photoId) await cleanPhoto(photoId); throw reason; }
    if (oldPhoto && oldPhoto !== photoId) await cleanPhoto(oldPhoto);
  }
  async function deleteRecord(id: string) {
    const photoId = data.records.find(r => r.id === id)?.photoId;
    await mutate({ type: 'deleteRecord', id }); await cleanPhoto(photoId);
  }
  return <CollectionContext.Provider value={{ data, storage, loading, error, warning, retry: () => setAttempt(v => v + 1), mutate, saveCoffee, deleteCoffee, saveMethod, deleteMethod, saveTechnique, deleteTechnique, saveRecipe, deleteRecipe, importLibrary, saveRecord, deleteRecord }}>{children}</CollectionContext.Provider>;
}

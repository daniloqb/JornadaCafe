import type { LocalStorage } from '../domain/local-storage';
import type { CollectionMutation } from '../domain/collection';
import type { BrewRecipe } from '../domain/brewing';
import { photoIsReferenced } from '../domain/photo-references';
import { sha256, type StoredPhoto } from '../transfer/core';
import { validatePhoto } from './photo-validation';

/** Prepare new identities, verify their bytes, then publish all references in the DB transaction.
 * A process death before publication may leave an orphan, never a missing referenced image.
 * On an ambiguous commit, reload references before deciding whether a staged file is removable.
 */
export async function mutateWithPhotos(storage: LocalStorage, mutation: CollectionMutation, photos: StoredPhoto[]) {
  const prepared: string[] = [];
  try {
    for (const photo of photos) {
      if (await storage.readPhoto(photo.id)) throw new Error('Identificação de fotografia já utilizada. Atualize a pré-visualização.');
      const { bytes } = await validatePhoto(photo.blob);
      prepared.push(photo.id);
      await storage.savePhoto(photo.id, photo.blob);
      const read = await storage.readPhoto(photo.id);
      if (!read || await sha256(new Uint8Array(await read.arrayBuffer())) !== await sha256(bytes)) throw new Error('Falha ao preparar a fotografia. Nenhuma referência foi publicada.');
    }
    await storage.mutateCollection(mutation);
  } catch (error) {
    const data = await storage.loadCollection().catch(() => undefined);
    if (data) for (const id of prepared) if (!photoIsReferenced(data, id)) await storage.deletePhoto(id).catch(() => undefined);
    throw error;
  }
}

export async function saveRecipeWithPhoto(storage: LocalStorage, value: BrewRecipe, photo?: Blob | null, fromId?: string) {
  const before = await storage.loadCollection();
  const oldPhotos = new Set(before.recipes.filter(r => r.familyId === (before.recipes.find(r => r.id === (fromId ?? value.id))?.familyId ?? value.familyId)).map(r => r.photoId).filter((id): id is string => !!id));
  const photoId = photo ? crypto.randomUUID() : photo === null ? null : undefined;
  await mutateWithPhotos(storage, { type: 'recipe', value, fromId, familyPhotoId: photoId }, photo && photoId ? [{ id: photoId, blob: photo }] : []);
  const after = await storage.loadCollection().catch(() => undefined);
  if (!after) return;
  for (const id of oldPhotos) if (!photoIsReferenced(after, id)) await storage.deletePhoto(id).catch(() => undefined);
}

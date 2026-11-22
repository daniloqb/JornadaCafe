import type { CollectionData } from './collection';

/** Photos belong to both library records and preserved historical identities. */
export function photoIsReferenced(data: CollectionData, id: string): boolean {
  return [...data.coffees, ...data.records, ...data.methods, ...data.techniques, ...data.recipes].some(item => item.photoId === id)
    || [...data.sessions, ...data.preparations].some(item => [item.snapshot.coffee, item.snapshot.method, item.snapshot.technique, item.snapshot.recipe].some(record => record?.photoId === id))
    || data.preparations.some(p => p.parameterCorrections?.original.coffee?.photoId === id);
}

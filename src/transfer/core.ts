import { collectionTables, type CollectionData } from '../domain/collection';
export const APP_VERSION = '0.7.2';
export const APPLICATION = 'minha-jornada-pelo-cafe';
export const PERSONAL_FORMAT_VERSION = 2;
export const LIBRARY_FORMAT_VERSION = 2;
export const LIMITS = { zip: 96 * 1024 * 1024, expanded: 160 * 1024 * 1024, entry: 16 * 1024 * 1024, entries: 2048, entities: 20000 };
export interface StoredPhoto { id: string; blob: Blob }
export interface ArchiveState { data: CollectionData; photos: StoredPhoto[] }
export interface PortablePreferences { appearance: 'light' | 'dark' | 'system'; textSize: 85 | 90 | 100 | 110 | 115; alerts: { sound: boolean; vibration: boolean } }
export const PENDING_PREFERENCES = 'restored-preferences-pending';
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b, 'en')).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}
export const contentHash = (value: unknown) => sha256(new TextEncoder().encode(canonical(value)));
export function requiredPhotoIds(data: CollectionData): string[] {
  const photos = new Set<string>();
  const add = (value?: { photoId?: string } | null) => { if (value?.photoId) photos.add(value.photoId); };
  for (const record of [...data.coffees, ...data.records, ...data.methods, ...data.techniques, ...data.recipes]) add(record);
  for (const record of [...data.preparations, ...data.sessions]) { add(record.snapshot.coffee); add(record.snapshot.method); add(record.snapshot.technique); add(record.snapshot.recipe); }
  for (const record of data.preparations) add(record.parameterCorrections?.original.coffee);
  return [...photos].sort();
}
export function collectionSummary(data: CollectionData, photos = requiredPhotoIds(data).length) {
  return { ...Object.fromEntries(collectionTables.map(table => [table, data[table].length])), photos } as Record<string, number>;
}
export const libraryStamp = (data: CollectionData) => canonical({ methods: data.methods, techniques: data.techniques, recipes: data.recipes });
export function recoveredCollection(data: CollectionData): CollectionData {
  return { ...data, sessions: data.sessions.map(s => ({ ...s, status: 'paused', needsConfirmation: true })) };
}
export function bytesToBase64(bytes: Uint8Array): string {
  let text = ''; for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
}
export const base64ToBytes = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

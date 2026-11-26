import type { CollectionData } from '../domain/collection';
import { allLibrarySelection, buildLibrary, planLibraryImport, type SharedLibrary } from '../transfer/library';
import { sha256, type StoredPhoto } from '../transfer/core';
import type { CatalogBundle, ReferenceKind } from './model';

/** Select whole families and their complete technical graph from the approved snapshot. */
export function selectReference(bundle: CatalogBundle, kind?: ReferenceKind, key?: string): SharedLibrary {
  const library = bundle.library;
  if (!library) throw new Error('O catálogo ainda depende do ZIP aprovado.');
  if (!kind) return library;
  const ids = bundle.identities;
  const recipes = kind === 'receitas' ? library.recipes.filter(r => ids.families[r.familyId] === key) : [];
  const techniques = library.techniques.filter(t => (kind === 'tecnicas' && ids.techniques[t.id] === key) || recipes.some(r => r.techniqueId === t.id));
  const methods = library.methods.filter(m => (kind === 'metodos' && ids.methods[m.id] === key) || recipes.some(r => r.methodId === m.id) || techniques.some(t => t.methodId === m.id));
  if ((kind === 'receitas' && !recipes.length) || (kind === 'tecnicas' && !techniques.length) || (kind === 'metodos' && !methods.length)) throw new Error('Esta referência não está disponível no catálogo.');
  return { methods, techniques, recipes };
}
export async function referenceCopies(data: CollectionData, bundle: CatalogBundle): Promise<Record<string, string>> {
  if (!bundle.library || (!data.methods.length && !data.techniques.length && !data.recipes.length)) return {};
  const current = await buildLibrary(data, allLibrarySelection(data));
  const copies: Record<string, string> = {};
  for (const group of ['methods', 'techniques', 'recipes'] as const) {
    for (const [local, fingerprint] of current.maps[group]) {
      const shared = bundle.library[group].find(r => r.id === fingerprint);
      if (shared) copies[group === 'recipes' && 'familyId' in shared ? bundle.identities.families[shared.familyId] : bundle.identities[group === 'methods' ? 'methods' : 'techniques'][fingerprint]] = local;
    }
  }
  return copies;
}
export async function planReferenceImport(data: CollectionData, bundle: CatalogBundle, kind?: ReferenceKind, key?: string, readAsset: (path: string) => Promise<Blob> = async path => {
  const response = await fetch(`/${path}`);
  if (!response.ok) throw new Error('Não foi possível ler uma imagem embarcada.');
  return response.blob();
}) {
  const selected = selectReference(bundle, kind, key);
  const images = new Set(selected.recipes.flatMap(r => r.image ? [r.image] : []));
  const photos: StoredPhoto[] = [];
  for (const hash of images) {
    const asset = bundle.images.find(p => p.sha256 === hash);
    if (!asset) throw new Error('Imagem do catálogo ausente.');
    const blob = await readAsset(asset.path);
    if (await sha256(new Uint8Array(await blob.arrayBuffer())) !== hash) throw new Error('Integridade da imagem embarcada divergente.');
    photos.push({ id: hash, blob });
  }
  const plan = await planLibraryImport(data, selected, photos);
  for (const group of ['methods', 'techniques', 'recipes'] as const) {
    for (const shared of selected[group]) {
      const local = plan.additions[group].find(r => r.id === plan.resolvedIds[group].get(shared.id));
      if (local) local.referenceKey = group === 'recipes' && 'familyId' in shared ? bundle.identities.families[shared.familyId] : bundle.identities[group === 'methods' ? 'methods' : 'techniques'][shared.id];
    }
  }
  return plan;
}

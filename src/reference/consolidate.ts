import { parseArchive } from '../transfer/archive';
import { canonical, sha256 } from '../transfer/core';
import { allLibrarySelection, buildLibrary, libraryCounts, validateSharedLibrary, verifySharedIdentities } from '../transfer/library';
import { object, text } from '../transfer/validation';
import { emptyCollection } from '../domain/collection';
import { importReferenceCatalog } from './import-reference';
import { photoType } from '../data/photo-validation';
import type { CatalogBundle, CatalogIdentities, CatalogImage, CatalogManifest } from './model';

export interface ImagePermission { sha256: string; origin: string; permission: string; credit?: string }
export interface ConsolidationOptions {
  rights?: ImagePermission[];
  /** New fingerprint -> existing public identity. Only reviewed, explicit continuity. */
  continuity?: Partial<CatalogIdentities>;
  now?: string;
}
const groups = ['methods', 'techniques', 'families', 'versions'] as const;
export function validateCatalogIdentities(bundle: CatalogBundle) {
  if (!bundle.library) throw new Error('Catálogo sem conteúdo aprovado.');
  validateSharedLibrary(bundle.library);
  const keys = {
    methods: bundle.library.methods.map(v => v.id), techniques: bundle.library.techniques.map(v => v.id),
    families: [...new Set(bundle.library.recipes.map(v => v.familyId))], versions: bundle.library.recipes.map(v => v.id),
  };
  const seen = new Set<string>();
  for (const group of groups) {
    const entries = Object.entries(bundle.identities[group]);
    if (canonical(entries.map(([k]) => k).sort()) !== canonical(keys[group].sort())) throw new Error(`Mapa de identidade incompleto: ${group}.`);
    for (const [, id] of entries) {
      if (!/^official-[a-f0-9-]{36}$/.test(id) || seen.has(id)) throw new Error('Identidade pública inválida ou repetida.');
      seen.add(id);
    }
  }
  const images = new Set(bundle.library.recipes.flatMap(r => r.image ? [r.image] : []));
  if (images.size !== bundle.images.length || new Set(bundle.images.map(i => i.sha256)).size !== images.size || bundle.images.some(i => !images.has(i.sha256) || !new RegExp(`^images/reference-library/${i.sha256}\\.(jpg|png|webp)$`).test(i.path))) throw new Error('Assets do catálogo inconsistentes.');
}
export async function consolidateCatalog(bytes: Uint8Array, previous: CatalogBundle, previousManifest: CatalogManifest, options: ConsolidationOptions = {}) {
  const archive = await parseArchive(bytes, 'library-share');
  if (archive.kind !== 'library-share') throw new Error('Selecione uma biblioteca compartilhável.');
  const counts = libraryCounts(archive.library);
  if (!counts.methods && !counts.techniques && !counts.recipes) throw new Error('O snapshot aprovado não contém registros.');
  if (previous.library) validateCatalogIdentities(previous);
  const permissions = new Map<string, ImagePermission>();
  for (const right of options.rights ?? []) {
    object(right, ['sha256', 'origin', 'permission', 'credit']);
    text(right.sha256); text(right.origin); text(right.permission); text(right.credit, true);
    if (!archive.photos.some(p => p.id === right.sha256) || permissions.has(right.sha256)) throw new Error('Autorização de imagem repetida ou sem imagem correspondente no ZIP.');
    permissions.set(right.sha256, right);
  }
  // No image permission is inferred from the personal photo or from inclusion in the ZIP.
  const library = structuredClone(archive.library);
  library.recipes = library.recipes.map(({ image, ...r }) => ({ ...r, ...(image && permissions.has(image) ? { image } : {}) }));
  for (const family of new Set(library.recipes.map(r => r.familyId))) {
    if (new Set(library.recipes.filter(r => r.familyId === family).flatMap(r => r.image ? [r.image] : [])).size > 1) throw new Error(`Família com fotografias divergentes: ${family}.`);
  }
  const ids: CatalogIdentities = { methods: {}, techniques: {}, families: {}, versions: {} };
  const received = { methods: library.methods.map(m => m.id), techniques: library.techniques.map(t => t.id), families: [...new Set(library.recipes.map(r => r.familyId))], versions: library.recipes.map(r => r.id) };
  object(options.continuity ?? {}, [...groups]);
  for (const group of groups) {
    const mapping = options.continuity?.[group] ?? {};
    object(mapping);
    for (const [fingerprint, stable] of Object.entries(mapping)) {
      if (!received[group].includes(fingerprint) || !Object.values(previous.identities[group]).includes(stable)) throw new Error(`Continuidade inválida: ${group}/${fingerprint}.`);
      if (previous.identities[group][fingerprint] && previous.identities[group][fingerprint] !== stable) throw new Error('O mapa não pode substituir a identidade de conteúdo já reconhecido.');
    }
    for (const fingerprint of received[group]) ids[group][fingerprint] = mapping[fingerprint] ?? previous.identities[group][fingerprint] ?? `official-${crypto.randomUUID()}`;
  }
  const images: CatalogImage[] = [], assets: { path: string; bytes: Uint8Array }[] = [];
  for (const photo of archive.photos) {
    const permission = permissions.get(photo.id); if (!permission) continue;
    const data = new Uint8Array(await photo.blob.arrayBuffer());
    const path = `images/reference-library/${photo.id}.${photoType(data).ext}`;
    images.push({ ...permission, path }); assets.push({ path, bytes: data });
  }
  images.sort((a, b) => a.sha256.localeCompare(b.sha256));
  const bundle: CatalogBundle = { schemaVersion: 1, library, identities: ids, images };
  validateCatalogIdentities(bundle); await verifySharedIdentities(library);
  const sourceHash = await sha256(bytes);
  const now = options.now ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(now))) throw new Error('Data de consolidação inválida.');
  const unchanged = previousManifest.source?.sha256 === sourceHash && canonical(previous) === canonical(bundle);
  const manifest: CatalogManifest = unchanged ? previousManifest : {
    catalogId: 'jornada-cafe-reference', version: previousManifest.version + 1, status: 'consolidated', consolidatedAt: now,
    source: { kind: 'approved-library-share', formatVersion: archive.manifest.formatVersion, sha256: sourceHash },
    counts: { ...counts, images: images.length }, compatibility: { catalogSchema: 1, libraryFormats: [1, 2], databaseSchema: 5 },
  };
  const rows = (b: CatalogBundle, group: typeof groups[number]) => Object.entries(b.identities[group]).map(([fingerprint, id]) => ({ id, fingerprint }));
  const changes = Object.fromEntries(groups.map(group => {
    const before = rows(previous, group), after = rows(bundle, group);
    return [group, {
      added: after.filter(a => !before.some(b => b.id === a.id)),
      modified: after.filter(a => before.some(b => b.id === a.id && b.fingerprint !== a.fingerprint)),
      removed: before.filter(b => !after.some(a => a.id === b.id)),
    }];
  }));
  const presentationChanges = library.recipes.filter(r => {
    const old = previous.library?.recipes.find(v => previous.identities.versions[v.id] === ids.versions[r.id]);
    return old && canonical({ image: old.image, asset: previous.images.find(i => i.sha256 === old.image) }) !== canonical({ image: r.image, asset: images.find(i => i.sha256 === r.image) });
  }).map(r => ids.versions[r.id]);
  let removedLegacy: Record<string, { key?: string; name: string }[]> | undefined;
  if (!previous.library) {
    const legacy = importReferenceCatalog(emptyCollection());
    const sharedLegacy = await buildLibrary(legacy, allLibrarySelection(legacy));
    removedLegacy = Object.fromEntries((['methods', 'techniques', 'recipes'] as const).map(group => [group, legacy[group].filter(row => !library[group].some(v => v.id === sharedLegacy.maps[group].get(row.id))).map(row => ({ key: row.referenceKey, name: row.name }))]));
  }
  const report = { manifest, unchanged, changes, presentationChanges, removedLegacy, images: { included: images.map(i => i.sha256), omittedWithoutPermission: archive.photos.filter(p => !permissions.has(p.id)).map(p => p.id) }, items: { methods: library.methods.map(v => v.name), techniques: library.techniques.map(v => v.name), recipes: library.recipes.map(v => ({ name: v.name, version: v.version, family: ids.families[v.familyId] })) } };
  return { bundle, manifest, assets, report };
}

import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import bundleJson from './generated/catalog.json';
import manifestJson from './generated/manifest.json';
import { verifyCatalog } from './verify';
import { consolidateCatalog } from './consolidate';
import { materializeCatalog, type CatalogBundle, type CatalogManifest, type CatalogIdentities } from './model';
import { planReferenceImport, referenceCopies, selectReference } from './import-official';
import { allLibrarySelection, applyLibraryImport, buildLibrary } from '../transfer/library';
import { createLibraryArchive, parseArchive } from '../transfer/archive';
import { fixture, personalPart } from '../transfer/fixtures.test-helper';
import { emptyCollection } from '../domain/collection';
import { makeSession } from '../domain/preparation';
import { sha256 } from '../transfer/core';
import { IndexedDBStorage } from '../data/indexeddb-storage';
import { validateStorage } from '../domain/local-storage';
import { mutateWithPhotos } from '../data/media-mutation';

// Synthetic test data never become the shipped catalog.
const pending: CatalogBundle = { schemaVersion: 1, library: null, identities: { methods: {}, techniques: {}, families: {}, versions: {} }, images: [] };
const pendingManifest: CatalogManifest = { catalogId: 'jornada-cafe-reference', version: 0, status: 'awaiting-approved-snapshot', consolidatedAt: null, source: null, counts: null, compatibility: { catalogSchema: 1, libraryFormats: [1, 2], databaseSchema: 5 } };
async function snapshot(images = false, edit = false) {
  const state = fixture('SENTINEL_PRIVATE');
  if (edit) state.data.methods[0].description = 'Descrição pública corrigida';
  if (images) state.data.recipes.forEach(r => { r.photoId = state.photos[0].id; });
  const prepared = await buildLibrary(state.data, allLibrarySelection(state.data), { includeImages: images, readPhoto: async id => state.photos.find(p => p.id === id)?.blob });
  return { state, prepared, zip: await createLibraryArchive(prepared.library, prepared.photos) };
}
const consolidate = (bytes: Uint8Array) => consolidateCatalog(bytes, pending, pendingManifest, { now: '2026-11-25T18:00:00Z' });

describe('consolidação oficial sem acessar instalações pessoais', () => {
  it('verifica os recursos embarcados sem exigir o ZIP de origem', async () => {
    await expect(verifyCatalog(bundleJson as CatalogBundle, manifestJson as CatalogManifest, async path => new Blob([await readFile(new URL(`../../public/${path}`, import.meta.url))]))).resolves.toHaveProperty('status');
    const { zip } = await snapshot(), result = await consolidate(zip.bytes);
    await expect(verifyCatalog(result.bundle, result.manifest, async () => new Blob())).resolves.toMatchObject({ status: 'consolidated' });
    await expect(verifyCatalog(result.bundle, { ...result.manifest, counts: { ...result.manifest.counts!, versions: 999 } }, async () => new Blob())).rejects.toThrow('Contagens');
  });
  it('lê fixture v1 histórica e preserva conteúdo, fontes, famílias e versões', async () => {
    const bytes = new Uint8Array(await readFile(new URL('../transfer/fixtures/library-v1.zip', import.meta.url)));
    const result = await consolidate(bytes), parsed = await parseArchive(bytes, 'library-share');
    if (parsed.kind !== 'library-share') throw Error();
    expect(result.bundle.library).toEqual(parsed.library);
    expect(result.manifest).toMatchObject({ status: 'consolidated', source: { formatVersion: 1, sha256: await sha256(bytes) }, counts: { methods: 1, techniques: 1, recipes: 1, versions: 2, images: 0 } });
    const catalog = materializeCatalog(result.bundle, result.manifest);
    expect(catalog.recipes[1]).toMatchObject({ familyId: catalog.recipes[0].familyId, previousVersionId: catalog.recipes[0].id, source: parsed.library.recipes[1].source, steps: parsed.library.recipes[1].steps });
    expect(catalog.techniques[0].creator).toBe(parsed.library.techniques[0].creator);
    expect(catalog.recipes[0].id).not.toBe(parsed.library.recipes[0].id);
  });
  it('conserva v2 e recusa empacotar fotografias sem autorização explícita', async () => {
    const { prepared, zip, state } = await snapshot(true);
    const result = await consolidate(zip.bytes);
    expect(result.manifest.source?.formatVersion).toBe(2);
    expect(result.manifest.counts?.images).toBe(0);
    expect(result.report.images.omittedWithoutPermission).toEqual(prepared.photos.map(p => p.id));
    expect(result.assets).toEqual([]);
    expect(result.bundle.library?.recipes.every(r => r.image === undefined)).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('SENTINEL_PRIVATE');
    for (const r of [...state.data.methods, ...state.data.techniques, ...state.data.recipes]) expect(serialized).not.toContain(r.id);
  });
  it('empacota somente a imagem autorizada, mantém créditos e verifica bytes na importação', async () => {
    const { prepared, zip } = await snapshot(true), image = prepared.photos[0];
    const rights = [{ sha256: image.id, origin: 'Fotografia fornecida pelo titular', permission: 'Autorizada para distribuição no aplicativo', credit: 'Crédito público' }];
    const result = await consolidateCatalog(zip.bytes, pending, pendingManifest, { rights });
    expect(result.manifest.counts?.images).toBe(1);
    expect(result.assets[0].bytes).toEqual(new Uint8Array(await image.blob.arrayBuffer()));
    expect(materializeCatalog(result.bundle, result.manifest).recipes[0]).toMatchObject({ imageCredit: 'Crédito público', imageUrl: `/${result.assets[0].path}` });
    await expect(planReferenceImport(emptyCollection(), result.bundle, undefined, undefined, async () => new Blob(['corrupt']))).rejects.toThrow('Integridade');
    await expect(consolidateCatalog(zip.bytes, pending, pendingManifest, { rights: [...rights, ...rights] })).rejects.toThrow('Autorização');
    const plan = await planReferenceImport(emptyCollection(), result.bundle, undefined, undefined, async () => image.blob);
    const store = new IndexedDBStorage(`official-photo-${crypto.randomUUID()}`);
    try {
      await validateStorage(store); await mutateWithPhotos(store, { type: 'importLibrary', plan }, plan.photos);
      await store.close(); await validateStorage(store);
      const saved = await store.loadCollection();
      expect(saved.recipes).toHaveLength(2); expect(saved.recipes[0].photoId).toBe(saved.recipes[1].photoId);
      expect(await sha256(new Uint8Array(await (await store.readPhoto(saved.recipes[0].photoId!))!.arrayBuffer()))).toBe(image.id);
      const repeated = await planReferenceImport(saved, result.bundle, undefined, undefined, async () => image.blob);
      expect(repeated.photos).toEqual([]); expect(repeated.additions.recipes).toEqual([]);
    } finally { await store.close(); }
  });
  it('repetir o mesmo snapshot conserva IDs, manifesto e versão; mudanças exigem continuidade explícita', async () => {
    const first = await snapshot(), second = await snapshot(false, true), old = await consolidate(first.zip.bytes);
    const repeated = await consolidateCatalog(first.zip.bytes, old.bundle, old.manifest);
    expect(repeated.report.unchanged).toBe(true); expect(repeated.manifest).toEqual(old.manifest); expect(repeated.bundle).toEqual(old.bundle);
    const changed = await consolidateCatalog(second.zip.bytes, old.bundle, old.manifest);
    expect(changed.report.changes.methods.added).toHaveLength(1);
    expect(changed.report.changes.methods.removed).toHaveLength(1);
    const continuity: CatalogIdentities = { methods: {}, techniques: {}, families: {}, versions: {} };
    // The test explicitly approves correspondence; production never infers it from names.
    for (const group of ['methods', 'techniques', 'families', 'versions'] as const) Object.keys(changed.bundle.identities[group]).forEach((fingerprint, i) => { continuity[group][fingerprint] = Object.values(old.bundle.identities[group])[i]; });
    const approved = await consolidateCatalog(second.zip.bytes, old.bundle, old.manifest, { continuity });
    expect(approved.report.changes.methods.modified).toHaveLength(1);
    expect(approved.report.changes.methods.added).toEqual([]);
    expect(approved.bundle.identities.versions[second.prepared.library.recipes[1].id]).toBe(Object.values(old.bundle.identities.versions)[1]);
    expect(approved.manifest.version).toBe(old.manifest.version + 1);
    continuity.versions[second.prepared.library.recipes[1].id] = Object.values(old.bundle.identities.versions)[0];
    await expect(consolidateCatalog(second.zip.bytes, old.bundle, old.manifest, { continuity })).rejects.toThrow('repetida');
  });
  it('recusa ZIP corrompido e continuidade desconhecida, sem alterar o catálogo anterior', async () => {
    const { zip } = await snapshot(), old = JSON.stringify(pending);
    await expect(consolidate(new Uint8Array([1, 2, 3]))).rejects.toThrow('ZIP');
    await expect(consolidateCatalog(zip.bytes, pending, pendingManifest, { continuity: { methods: { invalid: 'official-unknown' } } })).rejects.toThrow('Continuidade');
    expect(JSON.stringify(pending)).toBe(old);
  });
});

describe('importação do catálogo pelo domínio existente', () => {
  it('importa método, técnica e receita com todas as dependências e versões sob UUIDs pessoais', async () => {
    const { zip } = await snapshot(), result = await consolidate(zip.bytes), bundle = result.bundle;
    const cases = [ ['metodos', Object.values(bundle.identities.methods)[0], [1, 0, 0]], ['tecnicas', Object.values(bundle.identities.techniques)[0], [1, 1, 0]], ['receitas', Object.values(bundle.identities.families)[0], [1, 1, 2]] ] as const;
    for (const [kind, key, counts] of cases) {
      const plan = await planReferenceImport(emptyCollection(), bundle, kind, key);
      const data = applyLibraryImport(emptyCollection(), plan);
      expect([data.methods.length, data.techniques.length, data.recipes.length]).toEqual(counts);
      for (const r of [...data.methods, ...data.techniques, ...data.recipes]) expect(r.id).toMatch(/^[a-f0-9-]{36}$/);
      if (kind === 'receitas') {
        expect(data.recipes[1]).toMatchObject({ familyId: data.recipes[0].familyId, previousVersionId: data.recipes[0].id, version: 2, methodId: data.methods[0].id, techniqueId: data.techniques[0].id });
        expect(makeSession(data, data.recipes[1], undefined, undefined, Date.now(), 'running').snapshot.recipe.steps).toEqual(data.recipes[1].steps);
      }
      const repeated = await planReferenceImport(data, bundle, kind, key);
      expect(repeated.additions).toEqual({ methods: [], techniques: [], recipes: [] });
      expect((await referenceCopies(data, bundle))[key]).toBeDefined();
    }
    expect(() => selectReference(bundle, 'receitas', 'missing')).toThrow('não está disponível');
  });
  it('reconhece conteúdo compartilhado equivalente e preserva alterações pessoais, histórico e estoque', async () => {
    const { zip, state } = await snapshot(), result = await consolidate(zip.bytes), bundle = result.bundle;
    const before = structuredClone(state.data), plan = await planReferenceImport(before, bundle);
    expect(plan.additions).toEqual({ methods: [], techniques: [], recipes: [] });
    expect(personalPart(applyLibraryImport(before, plan))).toEqual(personalPart(before));
    const edited = structuredClone(before); edited.recipes[1].notes = 'Minha adaptação independente';
    const fresh = await planReferenceImport(edited, bundle), after = applyLibraryImport(edited, fresh);
    expect(after.recipes).toHaveLength(4);
    expect(after.recipes.find(r => r.id === edited.recipes[1].id)?.notes).toBe('Minha adaptação independente');
    expect(new Set(after.recipes.map(r => r.familyId)).size).toBe(2);
    expect(personalPart(after)).toEqual(personalPart(before));
    expect(await referenceCopies(edited, bundle)).not.toHaveProperty(Object.values(bundle.identities.families)[0]);
    expect(state.data).toEqual(before);
  });
});

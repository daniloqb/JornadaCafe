import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { applyMutation, emptyCollection, newEntity } from '../domain/collection';
import { photoIsReferenced } from '../domain/photo-references';
import { safeReferenceUrl } from '../domain/brewing';
import { createLibraryArchive, createPersonalArchive, parseArchive } from './archive';
import { buildLibrary, allLibrarySelection, planLibraryImport, applyLibraryImport } from './library';
import { canonical, requiredPhotoIds, sha256 } from './core';
import { fixture, preferences, personalPart } from './fixtures.test-helper';

function withRecipeImage() {
  const state = fixture();
  const id = crypto.randomUUID();
  for (const recipe of state.data.recipes) {
    recipe.photoId = id;
    recipe.source = { ...recipe.source!, author: 'Apresentador público', url: 'https://example.org/watch?v=123&list=abc#t=42' };
  }
  state.photos.push({ id, blob: state.photos[0].blob });
  return state;
}
const buildWithImages = (state: ReturnType<typeof withRecipeImage>) => buildLibrary(state.data, { methods: [], techniques: [], recipes: [state.data.recipes[1].id] }, { includeImages: true, readPhoto: async id => state.photos.find(p => p.id === id)?.blob });

describe('receitas, famílias e segurança histórica', () => {
  it('troca e remove a imagem da família sem criar versões nem reescrever snapshots ou estoque', () => {
    const { data } = withRecipeImage();
    data.preparations[0].snapshot.recipe.photoId = data.recipes[0].photoId;
    const original = canonical(personalPart(data)), old = data.recipes[0].photoId!, replacement = crypto.randomUUID();
    const changed = applyMutation(data, { type: 'recipe', value: data.recipes[1], familyPhotoId: replacement });
    expect(changed.recipes.map(r => r.photoId)).toEqual([replacement, replacement]);
    expect(changed.recipes.map(r => [r.id, r.familyId, r.version, r.previousVersionId])).toEqual(data.recipes.map(r => [r.id, r.familyId, r.version, r.previousVersionId]));
    expect(canonical(personalPart(changed))).toBe(original);
    expect(photoIsReferenced(changed, old)).toBe(true);
    const removed = applyMutation(changed, { type: 'recipe', value: changed.recipes[0], familyPhotoId: null });
    expect(removed.recipes.every(r => !r.photoId)).toBe(true);
    expect(requiredPhotoIds(removed)).toContain(old);
    expect(requiredPhotoIds(removed)).not.toContain(replacement);
    expect(removed.techniques).toEqual(data.techniques);
  });
  it('nova versão herda a mesma identidade de imagem e preserva fontes próprias por versão', () => {
    const { data } = withRecipeImage();
    const next = applyMutation(data, { type: 'recipe', fromId: data.recipes[1].id, value: { ...data.recipes[1], ...newEntity(), source: { id: crypto.randomUUID(), author: 'Outra referência' } } });
    expect(next.recipes[2]).toMatchObject({ version: 3, familyId: data.recipes[0].familyId, photoId: data.recipes[0].photoId, source: { author: 'Outra referência' } });
    expect(next.recipes[0]).toEqual(data.recipes[0]);
  });
  it.each(['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'httpss://site', '//example.org'])('recusa URL %s', url => {
    expect(safeReferenceUrl(url)).toBeUndefined();
    const { data } = fixture();
    expect(() => applyMutation(data, { type: 'recipe', value: { ...data.recipes[0], source: { id: 'source', url } } })).toThrow('https://');
  });
});

describe('backups pessoais v1 e v2', () => {
  it('lê fixture v1 emitida pelo código anterior e mantém a coleção integral no novo backup', async () => {
    const old = await parseArchive(new Uint8Array(readFileSync(new URL('./fixtures/personal-v1.zip', import.meta.url))), 'personal-full');
    if (old.kind !== 'personal-full') throw Error();
    expect(old.manifest.formatVersion).toBe(1);
    const next = await parseArchive((await createPersonalArchive(old, old.preferences)).bytes, 'personal-full');
    if (next.kind !== 'personal-full') throw Error();
    expect(canonical(next.data)).toBe(canonical(old.data));
    expect(next.manifest.formatVersion).toBe(2);
    expect(next.photos.map(p => p.id)).toEqual(old.photos.map(p => p.id));
  });
  it('inclui imagem própria e histórica, fontes e versões; deduplica conteúdo e compara todos os campos', async () => {
    const state = withRecipeImage();
    state.data.preparations[0].snapshot.recipe.photoId = state.photos[0].id;
    const archive = await createPersonalArchive(state, preferences);
    const result = await parseArchive(archive.bytes, 'personal-full');
    if (result.kind !== 'personal-full') throw Error();
    expect(canonical(result.data)).toBe(canonical(state.data));
    expect(Object.keys(unzipSync(archive.bytes)).filter(p => p.startsWith('photos/'))).toHaveLength(1);
    expect(result.photos).toHaveLength(7);
    await expect(createPersonalArchive({ ...state, photos: state.photos.slice(0, -1) }, preferences)).rejects.toThrow('ausente');
  });
});

describe('bibliotecas v2 com inclusão explícita de fotografias', () => {
  it('padrão não lê nem transfere bytes ou identificadores privados de nenhuma fotografia', async () => {
    const state = withRecipeImage();
    const prepared = await buildLibrary(state.data, allLibrarySelection(state.data), { readPhoto: async () => { throw Error('Não deve ler'); } });
    expect(prepared.includeImages).toBe(false); expect(prepared.photos).toEqual([]);
    const archive = await createLibraryArchive(prepared.library, prepared.photos), files = unzipSync(archive.bytes);
    expect(archive.manifest.counts.photos).toBe(0);
    expect(Object.keys(files).sort()).toEqual(['data/library.json', 'manifest.json']);
    const text = Object.values(files).map(bytes=>strFromU8(bytes)).join('\n');
    for (const id of requiredPhotoIds(state.data)) expect(text).not.toContain(id);
    expect(text).not.toContain('PRIVATE_A'); expect(text).not.toContain('photoId');
    expect(text).toContain('Apresentador público'); expect(text).toContain('v=123&list=abc#t=42');
  });
  it('inclui somente a imagem de receita selecionada, preserva fontes e deduplica as versões', async () => {
    const state = withRecipeImage();
    const requested: string[] = [];
    const prepared = await buildLibrary(state.data, { methods: [], techniques: [], recipes: [state.data.recipes[0].id] }, { includeImages: true, readPhoto: async id => { requested.push(id); return state.photos.find(p => p.id === id)?.blob; } });
    expect(requested).toEqual([state.data.recipes[0].photoId]); expect(prepared.photos).toHaveLength(1);
    const archive = await createLibraryArchive(prepared.library, prepared.photos), files = unzipSync(archive.bytes);
    expect(Object.keys(files).filter(p => p.startsWith('images/'))).toHaveLength(1);
    const parsed = await parseArchive(archive.bytes, 'library-share'); if (parsed.kind !== 'library-share') throw Error();
    expect(parsed.library).toEqual(JSON.parse(JSON.stringify(prepared.library)));
    expect(await sha256(new Uint8Array(await parsed.photos[0].blob.arrayBuffer()))).toBe(prepared.photos[0].id);
    const text = strFromU8(files['data/library.json']);
    for (const id of [...state.data.coffees, ...state.data.records, ...state.data.packages, ...state.data.recipes].map(r => r.id).concat(requiredPhotoIds(state.data))) expect(text).not.toContain(id);
  });
  it('imagem opcional não muda identidade técnica; reimportação não duplica nem sobrescreve fotografias', async () => {
    const state = withRecipeImage(), prepared = await buildWithImages(state);
    const without = (await buildLibrary(state.data, allLibrarySelection(state.data))).library;
    const first = applyLibraryImport(emptyCollection(), await planLibraryImport(emptyCollection(), without));
    const enriched = await planLibraryImport(first, prepared.library, prepared.photos);
    expect(enriched.additions.recipes).toHaveLength(0); expect(enriched.imageUpdates).toHaveLength(2); expect(enriched.photos).toHaveLength(1);
    const next = applyLibraryImport(first, enriched);
    const repeated = await planLibraryImport(next, prepared.library, prepared.photos);
    expect(repeated.photos).toEqual([]); expect(repeated.imageUpdates).toEqual([]); expect(repeated.duplicates).toBe(4);
    expect(applyLibraryImport(next, repeated)).toEqual(next);
    expect((await planLibraryImport(next, without)).additions.recipes).toEqual([]);
  });
  it('v1 previamente importada continua reconhecível por v2 e pode receber fotografia sob confirmação', async () => {
    const old = await parseArchive(new Uint8Array(readFileSync(new URL('./fixtures/library-v1.zip', import.meta.url))), 'library-share'); if (old.kind !== 'library-share') throw Error();
    const current = applyLibraryImport(emptyCollection(), await planLibraryImport(emptyCollection(), old.library));
    const photo = fixture().photos[0].blob;
    current.recipes.forEach(r => { r.photoId = '11111111-1111-4111-8111-111111111111'; });
    const prepared = await buildLibrary(current, allLibrarySelection(current), { includeImages: true, readPhoto: async () => photo });
    const target = applyLibraryImport(emptyCollection(), await planLibraryImport(emptyCollection(), old.library));
    const plan = await planLibraryImport(target, prepared.library, prepared.photos);
    expect(plan.duplicates).toBe(4); expect(plan.additions.recipes).toHaveLength(0); expect(plan.imageUpdates).toHaveLength(2);
  });
  it('diferenças reais de referência mantêm registros independentes com o mesmo nome', async () => {
    const state = withRecipeImage(), prepared = await buildWithImages(state), other = fixture();
    const plan = await planLibraryImport(other.data, prepared.library, prepared.photos);
    expect(plan.conflicts).toContain(state.data.recipes[0].name); expect(plan.additions.recipes).toHaveLength(2);
    expect(canonical(personalPart(applyLibraryImport(other.data, plan)))).toBe(canonical(personalPart(other.data)));
  });
  it('recusa fotografia ausente, truncada, SHA incorreto e imagem sem vínculo', async () => {
    const state = withRecipeImage(), prepared = await buildWithImages(state);
    await expect(createLibraryArchive(prepared.library)).rejects.toThrow('ausentes');
    await expect(createLibraryArchive(prepared.library, [{ id: prepared.photos[0].id, blob: new Blob([new Uint8Array([137, 80, 78, 71])]) }])).rejects.toThrow('inválido');
    const archive = await createLibraryArchive(prepared.library, prepared.photos), files = unzipSync(archive.bytes);
    const path = Object.keys(files).find(p => p.startsWith('images/'))!;
    delete files[path]; await expect(parseArchive(zipSync(files), 'library-share')).rejects.toThrow('Integridade');
    const corrupt = unzipSync(archive.bytes); corrupt[path][20] ^= 1; await expect(parseArchive(zipSync(corrupt), 'library-share')).rejects.toThrow('Integridade');
    const bad = unzipSync(archive.bytes), manifest = JSON.parse(strFromU8(bad['manifest.json']));
    manifest.formatVersion = 99; bad['manifest.json'] = strToU8(JSON.stringify(manifest)); await expect(parseArchive(zipSync(bad), 'library-share')).rejects.toThrow('incompatível');
  });
});

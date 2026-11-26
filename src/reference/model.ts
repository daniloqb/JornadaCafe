import type { BrewMethod, BrewRecipe, BrewTechnique, SourceReference } from '../domain/brewing';
import type { SharedLibrary } from '../transfer/library';

export type ReferenceKind = 'metodos' | 'tecnicas' | 'receitas';
export interface ReferenceMethod extends BrewMethod { referenceKey: string; principle?: string; characteristics?: string; sources: SourceReference[] }
export interface ReferenceTechnique extends BrewTechnique { referenceKey: string }
export interface ReferenceRecipe extends BrewRecipe { referenceKey: string; imageUrl?: string; imageCredit?: string }
export interface CatalogIdentities {
  methods: Record<string, string>; techniques: Record<string, string>;
  families: Record<string, string>; versions: Record<string, string>;
}
export interface CatalogImage { sha256: string; path: string; origin: string; permission: string; credit?: string }
export interface CatalogBundle { schemaVersion: 1; library: SharedLibrary | null; identities: CatalogIdentities; images: CatalogImage[] }
export interface CatalogManifest {
  catalogId: 'jornada-cafe-reference'; version: number; status: 'consolidated' | 'awaiting-approved-snapshot';
  consolidatedAt: string | null; source: { kind: 'approved-library-share'; formatVersion: 1 | 2; sha256: string } | null;
  counts: { methods: number; techniques: number; recipes: number; versions: number; images: number } | null;
  compatibility: { catalogSchema: 1; libraryFormats: number[]; databaseSchema: 5 };
}
export function materializeCatalog(bundle: CatalogBundle, manifest: CatalogManifest) {
  if (!bundle.library) throw new Error('O catálogo ainda depende do ZIP aprovado.');
  const { library: l, identities: ids } = bundle;
  const entity = { createdAt: manifest.consolidatedAt!, updatedAt: manifest.consolidatedAt! };
  const methods: ReferenceMethod[] = l.methods.map(m => ({ ...entity, ...m, id: ids.methods[m.id], referenceKey: ids.methods[m.id], sources: [] }));
  const techniques: ReferenceTechnique[] = l.techniques.map(t => ({ ...entity, ...t, id: ids.techniques[t.id], referenceKey: ids.techniques[t.id], methodId: t.methodId ? ids.methods[t.methodId] : undefined }));
  const recipes: ReferenceRecipe[] = l.recipes.map(({ image, ...r }) => {
    const asset = bundle.images.find(p => p.sha256 === image);
    return { ...entity, ...r, id: ids.versions[r.id], familyId: ids.families[r.familyId], referenceKey: ids.families[r.familyId], previousVersionId: r.previousVersionId ? ids.versions[r.previousVersionId] : undefined, methodId: ids.methods[r.methodId], techniqueId: r.techniqueId ? ids.techniques[r.techniqueId] : undefined, imageUrl: asset ? `/${asset.path}` : undefined, imageCredit: asset?.credit };
  });
  return { version: manifest.version, methods, techniques, recipes };
}

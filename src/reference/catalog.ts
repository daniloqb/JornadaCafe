import bundleJson from './generated/catalog.json';
import manifestJson from './generated/manifest.json';
import { materializeCatalog, type CatalogBundle, type CatalogManifest, type ReferenceKind, type ReferenceMethod, type ReferenceTechnique, type ReferenceRecipe } from './model';
import { latestRecipes } from '../domain/brewing';
import { referenceCatalog as legacyCatalog } from './legacy-catalog';
export { pourOverGuide, pourOverSources } from './legacy-catalog';
export type { ReferenceKind, ReferenceMethod, ReferenceTechnique, ReferenceRecipe } from './model';
export const catalogBundle = bundleJson as CatalogBundle;
export const catalogManifest = manifestJson as CatalogManifest;
export const hasOfficialCatalog = catalogBundle.library !== null;
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export const referenceCatalog: { version: number; methods: ReferenceMethod[]; techniques: ReferenceTechnique[]; recipes: ReferenceRecipe[] } = freeze(hasOfficialCatalog ? materializeCatalog(catalogBundle, catalogManifest) : legacyCatalog);
export const catalogVersion = referenceCatalog.version;
export function referenceItems(kind: 'metodos'): ReferenceMethod[];
export function referenceItems(kind: 'tecnicas'): ReferenceTechnique[];
export function referenceItems(kind: 'receitas'): ReferenceRecipe[];
export function referenceItems(kind: ReferenceKind): ReferenceMethod[] | ReferenceTechnique[] | ReferenceRecipe[];
export function referenceItems(kind: ReferenceKind) {
  return kind === 'metodos' ? referenceCatalog.methods : kind === 'tecnicas' ? referenceCatalog.techniques : latestRecipes(referenceCatalog.recipes) as typeof referenceCatalog.recipes;
}

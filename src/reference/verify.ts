import { canonical, sha256 } from '../transfer/core';
import { libraryCounts, verifySharedIdentities } from '../transfer/library';
import { text } from '../transfer/validation';
import { validatePhoto } from '../data/photo-validation';
import { validateCatalogIdentities } from './consolidate';
import type { CatalogBundle, CatalogManifest } from './model';

/** Verify only frozen project resources; no source ZIP, personal DB or network is needed. */
export async function verifyCatalog(bundle: CatalogBundle, manifest: CatalogManifest, readAsset: (path: string) => Promise<Blob>) {
  if (bundle.schemaVersion !== 1 || manifest.catalogId !== 'jornada-cafe-reference' || canonical(manifest.compatibility) !== canonical({ catalogSchema: 1, libraryFormats: [1, 2], databaseSchema: 5 })) throw new Error('Contrato do catálogo incompatível.');
  if (!bundle.library) {
    if (manifest.status !== 'awaiting-approved-snapshot' || manifest.version !== 0 || manifest.source !== null || manifest.counts !== null || manifest.consolidatedAt !== null || bundle.images.length || Object.values(bundle.identities).some(group => Object.keys(group).length)) throw new Error('Estado de espera do catálogo inconsistente.');
    return { status: manifest.status, message: 'ZIP aprovado pendente; catálogo anterior preservado.' };
  }
  if (manifest.status !== 'consolidated' || !Number.isInteger(manifest.version) || manifest.version < 1 || !manifest.consolidatedAt || !Number.isFinite(Date.parse(manifest.consolidatedAt)) || manifest.source?.kind !== 'approved-library-share' || ![1, 2].includes(manifest.source.formatVersion) || !/^[a-f0-9]{64}$/.test(manifest.source.sha256)) throw new Error('Manifesto do catálogo inválido.');
  validateCatalogIdentities(bundle); await verifySharedIdentities(bundle.library);
  if (canonical(manifest.counts) !== canonical({ ...libraryCounts(bundle.library), images: bundle.images.length })) throw new Error('Contagens do catálogo divergentes.');
  for (const asset of bundle.images) {
    text(asset.origin); text(asset.permission); text(asset.credit, true);
    const { bytes, ext } = await validatePhoto(await readAsset(asset.path));
    if (await sha256(bytes) !== asset.sha256 || asset.path !== `images/reference-library/${asset.sha256}.${ext}`) throw new Error('Imagem embarcada inválida ou corrompida.');
  }
  return { status: manifest.status, version: manifest.version, counts: manifest.counts };
}

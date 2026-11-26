import type { CollectionData } from '../domain/collection';
import { applyBrewingMutation, type BrewingMutation } from '../domain/brewing';
import { referenceCatalog, referenceItems, type ReferenceKind } from './legacy-catalog';

export type ReferenceMutation = { type: 'importReference'; kind: ReferenceKind; key: string } | { type: 'importReferenceCatalog' };
/** One shared transaction imports the dependency graph. Stable IDs never merge by name. */
export function importReference(data: CollectionData, action: Extract<ReferenceMutation, { type: 'importReference' }>): CollectionData {
  const item = referenceItems(action.kind).find(v => v.referenceKey === action.key);
  if (!item) throw new Error('Esta referência não está disponível nesta versão do catálogo.');
  let next = data;
  const apply = (mutation: BrewingMutation) => { next = applyBrewingMutation(next, mutation)!; };
  const exists = (kind: ReferenceKind, id: string, key: string) => {
    const items = kind === 'metodos' ? next.methods : kind === 'tecnicas' ? next.techniques : next.recipes;
    const found = items.find(v => v.id === id || (kind === 'receitas' && 'familyId' in v && v.familyId === id));
    if (found && found.referenceKey !== key) throw new Error('A identificação desta referência já está em uso. Nenhum dado foi alterado.');
    return !!found;
  };
  const method = (id: string) => {
    const ref = referenceCatalog.methods.find(m => m.id === id)!;
    if (exists('metodos', ref.id, ref.referenceKey)) return;
    const { principle, characteristics, sources, ...value } = structuredClone(ref);
    value.notes = [principle, characteristics, value.notes, `Fontes: ${sources.map(s => `${s.author}: ${s.title}${s.url ? ` (${s.url})` : ''}`).join('; ')}`].filter(Boolean).join('\n\n');
    apply({ type: 'method', value: { ...value, createdAt: new Date().toISOString() } });
  };
  const technique = (id: string) => {
    const ref = referenceCatalog.techniques.find(t => t.id === id)!;
    if (exists('tecnicas', ref.id, ref.referenceKey)) return;
    if (ref.methodId) method(ref.methodId);
    apply({ type: 'technique', value: { ...structuredClone(ref), createdAt: new Date().toISOString() } });
  };
  if (exists(action.kind, item.id, item.referenceKey)) return data;
  if (action.kind === 'metodos') method(item.id);
  else if (action.kind === 'tecnicas') technique(item.id);
  else {
    const ref = referenceCatalog.recipes.find(r => r.id === item.id)!;
    method(ref.methodId);
    if (ref.techniqueId) technique(ref.techniqueId);
    const importedTechnique = next.techniques.find(t => t.id === ref.techniqueId);
    if (importedTechnique?.methodId && importedTechnique.methodId !== ref.methodId) throw new Error('Sua cópia da técnica foi associada a outro método. Revise essa associação antes de adicionar esta receita. Suas edições foram preservadas.');
    apply({ type: 'recipe', value: { ...structuredClone(ref), createdAt: new Date().toISOString() } });
  }
  return next;
}

/** Adds the complete catalog through the same personal-record validation, in dependency order. */
export function importReferenceCatalog(data: CollectionData): CollectionData {
  let next = data;
  for (const kind of ['metodos', 'tecnicas', 'receitas'] as const) {
    for (const item of referenceItems(kind)) next = importReference(next, { type: 'importReference', kind, key: item.referenceKey });
  }
  return next;
}

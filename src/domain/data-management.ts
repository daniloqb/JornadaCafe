import type { CollectionData } from './collection';

export type ClearDataScope = 'personal' | 'library';

/** Keep historical snapshots independent from the current technical library. */
export function clearCollectionData(data: CollectionData, scope: ClearDataScope): CollectionData {
  if (scope !== 'personal' && scope !== 'library') throw new Error('Selecione os dados que deseja limpar.');
  if (data.sessions.length) throw new Error('Conclua ou descarte o preparo em andamento antes de limpar dados.');
  if (scope === 'library') return { ...data, methods: [], techniques: [], recipes: [] };
  return {
    ...data, coffees: [], records: [], packages: [], preparations: [], sessions: [], reflections: [],
    recipes: data.recipes.map(recipe => {
      if (recipe.coffeeId === undefined) return recipe;
      const { coffeeId: _coffeeId, ...technicalRecipe } = recipe;
      return technicalRecipe;
    }),
  };
}

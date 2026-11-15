export const destinations = ['inicio', 'cafes', 'preparar', 'jornada', 'descobertas'] as const;
export type Destination = typeof destinations[number];

export function currentDestination(): Destination {
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  return destinations.find((destination) => destination === hash) ?? 'inicio';
}

import type { SessionRecord } from '../contracts';

export const MAX_VISIBLE_FLOWERS = 28;
export type GardenStage = 'meadow' | 'seedling' | 'youngTree' | 'canopy';
export function getGardenState(records: SessionRecord[]) {
  const flowers = records.filter(record => record.outcome === 'completed').length;
  const stage: GardenStage = flowers >= 14 ? 'canopy' : flowers >= 7 ? 'youngTree' : flowers >= 3 ? 'seedling' : 'meadow';
  return { flowers, visibleFlowers: Math.min(flowers, MAX_VISIBLE_FLOWERS), stage };
}

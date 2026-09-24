import type { SessionRecord } from '../contracts';

/** Unknown ratings and interrupted sessions never contribute to preferences. */
export function hasFeedback(record: SessionRecord): record is SessionRecord & { feedback: -1 | 0 | 1 | 2 } {
  return record.outcome === 'completed' && [-1, 0, 1, 2].some(value => value === record.feedback);
}

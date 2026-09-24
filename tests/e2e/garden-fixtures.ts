import type { AppData, Feedback, SessionRecord } from '../../src/contracts';

// Synthetic records only. Never read or export a user's browser profile.
export function gardenBackup(completed: number, stopped = 0, legacy = false): AppData {
  const records: SessionRecord[] = [];
  const feedbacks: Feedback[] = [null, -1, 0, 1, 2];
  for (let index = 0; index < completed + stopped; index += 1) {
    const done = index < completed;
    const start = Date.UTC(2026, 8, 1, 0, index * 2);
    const seconds = done ? 60 : 12;
    records.push({
      id: `garden-qa-${index}`, activityId: 'detach-colors',
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(start + seconds * 1000).toISOString(),
      checkIn: { energy: 3, drain: 'unsure', minutes: 1 },
      actualSeconds: seconds, outcome: done ? 'completed' : 'stopped',
      feedback: feedbacks[index % feedbacks.length], note: `测试花园 ${index} / QA garden`,
    });
  }
  return { version: 1, records, favorites: [], theme: 'light', ...(legacy ? {} : { language: 'zh-CN' as const }) };
}

export const gardenCases = [
  { completed: 0, stopped: 3, stage: 'meadow' },
  { completed: 1, stopped: 0, stage: 'meadow' },
  { completed: 2, stopped: 1, stage: 'meadow' },
  { completed: 3, stopped: 2, stage: 'seedling' },
  { completed: 6, stopped: 0, stage: 'seedling' },
  { completed: 7, stopped: 2, stage: 'youngTree' },
  { completed: 13, stopped: 1, stage: 'youngTree' },
  { completed: 14, stopped: 3, stage: 'canopy' },
  { completed: 35, stopped: 5, stage: 'canopy' },
] as const;

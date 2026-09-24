import type { Recommend } from '../contracts';
import { hasFeedback } from './feedback';

export const recommend: Recommend = (checkIn, activities, records, excludedIds = []) => {
  const excluded = new Set(excludedIds);
  const ratings = new Map<string, { sum: number; count: number }>();
  for (const record of records) {
    if (!hasFeedback(record)) continue;
    const rating = ratings.get(record.activityId) ?? { sum: 0, count: 0 };
    rating.sum += record.feedback;
    rating.count += 1;
    ratings.set(record.activityId, rating);
  }
  const preference = (id: string) => {
    const rating = ratings.get(id);
    // A single trial should not decide future recommendations.
    return rating && rating.count >= 3 ? rating.sum / rating.count : 0;
  };
  return activities
    .filter(activity => !excluded.has(activity.id)
      && (checkIn.energy > 2 || activity.effort === 'low')
      && activity.variants[checkIn.minutes]?.steps.length > 0)
    .map((activity, index) => ({ activity, index }))
    .sort((a, b) => Number(b.activity.drains.includes(checkIn.drain)) - Number(a.activity.drains.includes(checkIn.drain))
      || preference(b.activity.id) - preference(a.activity.id)
      || a.index - b.index)[0]?.activity ?? null;
};

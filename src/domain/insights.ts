import type { GetInsights } from '../contracts';
import { hasFeedback } from './feedback';
import { getActivities } from '../data/activities';

export const getInsights: GetInsights = (records, activities, locale = 'zh-CN') => {
  const titles = new Map(getActivities(locale).map(activity => [activity.id, activity.title]));
  const known = new Set(activities.map(activity => activity.id));
  const valid = records.filter(hasFeedback).filter(record => known.has(record.activityId));
  if (valid.length < 5) return [];
  const positive = valid.filter(record => record.feedback > 0).length;
  const insights = [{
    sampleSize: valid.length,
    text: locale === 'en'
      ? `Of ${valid.length} completed sessions with feedback, ${positive} reported more energy. This describes your records only; it does not show that the activity caused the change.`
      : `在 ${valid.length} 条已完成且填写反馈的记录中，${positive} 条反馈为多了一点电。这只描述你的记录，不能说明变化由动作造成。`,
  }];
  for (const activity of activities) {
    const samples = valid.filter(record => record.activityId === activity.id);
    if (samples.length < 5) continue;
    insights.push({ sampleSize: samples.length,
      text: locale === 'en'
        ? `“${titles.get(activity.id) ?? activity.title}” has ${samples.length} completed sessions with feedback, including ${samples.filter(record => record.feedback > 0).length} positive ratings. This is not a guarantee of results.`
        : `「${titles.get(activity.id) ?? activity.title}」有 ${samples.length} 条有效完成反馈，其中 ${samples.filter(record => record.feedback > 0).length} 条为正向反馈；这不是效果保证。` });
  }
  return insights.slice(0, 3);
};

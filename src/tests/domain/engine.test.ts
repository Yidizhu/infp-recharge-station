import { describe, expect, it } from 'vitest';
import type { Activity, CheckIn, SessionRecord } from '../../contracts';
import { activities } from '../../data/activities';
import { recommend } from '../../domain/recommend';
import { getInsights } from '../../domain/insights';

const checkIn: CheckIn = { energy: 2, drain: 'rumination', minutes: 3 };
const record = (activityId: string, feedback: SessionRecord['feedback'], outcome: SessionRecord['outcome'] = 'completed'): SessionRecord => ({
  id: 'r', activityId, feedback, outcome, checkIn, actualSeconds: 60, note: '',
  startedAt: '2026-09-22T00:00:00.000Z', endedAt: '2026-09-22T00:01:00.000Z',
});
const a: Activity = { ...activities[0], id: 'a', drains: ['rumination'] };
const b: Activity = { ...a, id: 'b' };

describe('动作库', () => {
  it('恰好六类各四个动作，ID 唯一且三个版本完整', () => {
    expect(activities).toHaveLength(24);
    expect(new Set(activities.map(item => item.id)).size).toBe(24);
    for (const kind of ['detach', 'relax', 'control', 'mastery', 'connect', 'meaning']) {
      expect(activities.filter(item => item.kind === kind)).toHaveLength(4);
    }
    for (const item of activities) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.environment.length).toBeGreaterThan(0);
      for (const minutes of [1, 3, 10] as const) {
        expect(item.variants[minutes].intro).toBeTruthy();
        expect(item.variants[minutes].steps.length).toBeGreaterThan(0);
        expect(item.variants[minutes].steps.every(step => step.trim().length > 0)).toBe(true);
      }
    }
  });
});

describe('推荐行为', () => {
  it.each([1, 2] as const)('电量 %i 不受高分历史诱导推荐中负担动作', energy => {
    const medium = { ...b, effort: 'medium' as const };
    const history = Array.from({ length: 5 }, () => record('b', 2));
    expect(recommend({ ...checkIn, energy }, [medium, a], history)?.id).toBe('a');
    expect(recommend({ ...checkIn, energy }, [medium], history)).toBeNull();
  });
  it('时长版本缺失时排除，即使耗能源匹配', () => {
    const incomplete = { ...a, variants: { 1: a.variants[1] } } as Activity;
    expect(recommend(checkIn, [incomplete, b], [])?.id).toBe('b');
  });
  it('全部排除与空库返回 null，逐次换卡最终耗尽', () => {
    expect(recommend(checkIn, [], [])).toBeNull();
    const excluded: string[] = [];
    for (let i = 0; i < 2; i++) {
      const next = recommend(checkIn, [a, b], [], excluded);
      expect(next).not.toBeNull();
      excluded.push(next!.id);
    }
    expect(new Set(excluded).size).toBe(2);
    expect(recommend(checkIn, [a, b], [], excluded)).toBeNull();
  });
  it('同分按传入顺序稳定选择，不改输入', () => {
    const input = Object.freeze([b, a]);
    expect(recommend(checkIn, input as unknown as Activity[], [])).toBe(b);
    expect(recommend(checkIn, input as unknown as Activity[], [])).toBe(b);
    expect(input.map(item => item.id)).toEqual(['b', 'a']);
  });
  it('耗能源匹配优先于个人反馈', () => {
    const unmatched = { ...b, drains: ['body' as const] };
    expect(recommend(checkIn, [unmatched, a], Array.from({ length: 5 }, () => record('b', 2)))).toBe(a);
  });
  it('三条有效反馈才影响同匹配候选，null 和停止不参与', () => {
    expect(recommend(checkIn, [a, b], [record('b', 2), record('b', 2)])).toBe(a);
    expect(recommend(checkIn, [a, b], [record('b', 2), record('b', 2), record('b', null), record('b', 2, 'stopped')])).toBe(a);
    expect(recommend(checkIn, [a, b], Array.from({ length: 3 }, () => record('b', 1)))).toBe(b);
  });
  it('零分参与样本，负分不会被当作成功', () => {
    expect(recommend(checkIn, [a, b], [record('a', -1), record('a', 0), record('a', 0)])).toBe(b);
  });
});

describe('洞察', () => {
  it('不足五条有效反馈无洞察，未知动作与停止记录不计入', () => {
    const history = Array.from({ length: 4 }, () => record('a', 1));
    expect(getInsights([...history, record('a', null), record('a', 2, 'stopped'), record('unknown', 2)], [a])).toEqual([]);
  });
  it('五条反馈显示准确样本数，零与负值均不是正向反馈', () => {
    const history = [-1, 0, 1, 2, 0].map(feedback => record('a', feedback as SessionRecord['feedback']));
    const result = getInsights([...history, record('a', null)], [a]);
    expect(result[0].sampleSize).toBe(5);
    expect(result[0].text).toContain('2 条反馈');
    expect(result[0].text).toContain('不能说明');
    expect(result.every(item => item.sampleSize >= 5)).toBe(true);
  });
});

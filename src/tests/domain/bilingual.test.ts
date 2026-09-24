import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppData, SessionRecord } from '../../contracts';
import { activities, getActivities } from '../../data/activities';
import { getInsights } from '../../domain/insights';
import { recommend } from '../../domain/recommend';
import { exportData, loadData, parseImport, saveData, STORAGE_KEY } from '../../storage/store';

const data = (): AppData => ({ version: 1, theme: 'system', favorites: [activities[0].id], records: [{
  id: 'r', activityId: activities[0].id, startedAt: '2026-09-22T00:00:00.000Z', endedAt: '2026-09-22T00:01:00.000Z',
  checkIn: { energy: 1, minutes: 1, drain: 'rumination' }, actualSeconds: 60, outcome: 'completed', feedback: null,
  note: '私人备注 stays exactly as written',
}] });
const english = (text: string | undefined) => {
  expect(text).toBeTruthy();
  expect(text).not.toMatch(/[\u3400-\u9fff]/);
};
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('双语动作与洞察', () => {
  it('24 条英文完整、所有版本结构相同，身份和推荐元数据不变', () => {
    const en = getActivities('en');
    expect(en).toHaveLength(24);
    expect(getActivities('zh-CN')).toBe(activities);
    en.forEach((activity, i) => {
      const zh = activities[i];
      expect({ ...activity, title: zh.title, environment: zh.environment, variants: zh.variants }).toEqual(zh);
      english(activity.title);
      english(activity.environment);
      for (const minutes of [1, 3, 10] as const) {
        english(activity.variants[minutes].intro);
        expect(activity.variants[minutes].steps).toHaveLength(zh.variants[minutes].steps.length);
        activity.variants[minutes].steps.forEach(english);
      }
    });
  });
  it('切换语言不改变推荐 ID、排除行为或原中文库', () => {
    const before = JSON.stringify(activities);
    const checkIn = data().records[0].checkIn;
    const zh = recommend(checkIn, activities, [], [activities[0].id]);
    const en = recommend(checkIn, getActivities('en'), [], [activities[0].id]);
    expect(en?.id).toBe(zh?.id);
    expect(en?.title).not.toBe(zh?.title);
    expect(JSON.stringify(activities)).toBe(before);
  });
  it('英文洞察包含相同样本量与英文动作名，备注不被翻译', () => {
    const records: SessionRecord[] = Array.from({ length: 5 }, (_, i) => ({ ...data().records[0], id: `r${i}`, feedback: i < 2 ? 1 : 0 }));
    const before = JSON.stringify(records);
    const en = getInsights(records, activities, 'en');
    const zh = getInsights(records, getActivities('en'), 'zh-CN');
    expect(en.map(item => item.sampleSize)).toEqual(zh.map(item => item.sampleSize));
    en.forEach(item => english(item.text));
    expect(en[0].text).toContain('2 reported more energy');
    expect(en[1].text).toContain(getActivities('en')[0].title);
    expect(zh[1].text).toContain(activities[0].title);
    expect(getInsights(records.slice(0, 4), activities, 'en')).toEqual([]);
    expect(JSON.stringify(records)).toBe(before);
  });
});

describe('v1 语言兼容', () => {
  it.each([undefined, 'system', 'zh-CN', 'en'] as const)('新旧备份往返：%s', language => {
    const original = data();
    if (language !== undefined) original.language = language;
    expect(parseImport(exportData(original, 'en'), 'en')).toEqual({ data: original });
    expect(saveData(original, 'en')).toEqual({ ok: true });
    expect(loadData('en')).toEqual({ data: original });
    expect(loadData().data.language ?? 'system').toBe(language ?? 'system');
    expect(loadData().data.records[0].note).toBe(original.records[0].note);
  });
  it.each([null, '', 'fr', 'EN', 1, {}, []])('拒绝非法 language：%s', language => {
    const result = parseImport(JSON.stringify({ ...data(), language }), 'en');
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('Invalid language preference.');
  });
  it('合法 language 不使未知字段或无效嵌套字段通过', () => {
    english(parseImport(JSON.stringify({ ...data(), language: 'en', extra: true }), 'en').error);
    const invalid = data();
    invalid.language = 'en';
    invalid.records[0].actualSeconds = -1;
    english(parseImport(JSON.stringify(invalid), 'en').error);
    english(saveData({ ...data(), language: undefined }, 'en').warning);
  });
});

describe('英文存储错误与副作用', () => {
  it.each(['{bad', 'null', '{"version":2}', '{"version":1}', ' '.repeat(2_000_001)])('错误内容提示为英文（案例 %#）', raw => {
    english(parseImport(raw, 'en').error);
    localStorage.setItem(STORAGE_KEY, raw);
    english(loadData('en').warning);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('英文读取与写入失败提示，不意外写入', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    english(loadData('en').warning);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    english(saveData(data(), 'en').warning);
  });
  it('导出校验错误随 locale，默认保持中文', () => {
    const invalid = { ...data(), language: 'fr' } as unknown as AppData;
    expect(() => exportData(invalid, 'en')).toThrow('Invalid language preference.');
    expect(() => exportData(invalid)).toThrow('语言字段不合法。');
    expect(parseImport('{bad').error).toContain('无法解析');
  });
});

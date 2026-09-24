import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppData } from '../../contracts';
import { exportData, loadData, parseImport, saveData, STORAGE_KEY } from '../../storage/store';

const fixture = (): AppData => ({ version: 1, favorites: ['detach-colors'], theme: 'system', records: [{
  id: 'session-1', activityId: 'detach-colors', startedAt: '2026-09-22T00:00:00.000Z', endedAt: '2026-09-22T00:01:00.000Z',
  actualSeconds: 60, checkIn: { energy: 1, drain: 'body', minutes: 1 }, outcome: 'completed', feedback: null, note: '现在想休息',
}] });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('本地数据', () => {
  it('首次加载为空，不写入且每次默认数据独立', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const first = loadData();
    expect(first.warning).toBeUndefined();
    first.data.favorites.push('a');
    expect(loadData().data.favorites).toEqual([]);
    expect(write).not.toHaveBeenCalled();
  });
  it('保存、读取、导出、解析保留 null 与中文，解析不写存储', () => {
    const data = fixture();
    expect(saveData(data)).toEqual({ ok: true });
    expect(loadData()).toEqual({ data });
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(parseImport(exportData(data))).toEqual({ data });
    expect(write).not.toHaveBeenCalled();
  });
  it.each(['{bad', '', '{"version":2}', 'null'])('损坏或不支持的存储 %s 不被覆盖', raw => {
    localStorage.setItem(STORAGE_KEY, raw);
    const result = loadData();
    expect(result.warning).toBeTruthy();
    expect(result.data.records).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('读取被禁用时有警告；写入配额失败保留原数据', () => {
    localStorage.setItem(STORAGE_KEY, 'original');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(loadData().warning).toBeTruthy();
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(saveData(fixture())).toMatchObject({ ok: false, warning: expect.any(String) });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('original');
  });
  it('访问 localStorage 属性本身被禁用时仍返回错误', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
    expect(loadData().warning).toBeTruthy();
    expect(saveData(fixture()).ok).toBe(false);
  });
  it('无效保存与导出明确失败，不覆盖已有数据', () => {
    saveData(fixture());
    const before = localStorage.getItem(STORAGE_KEY);
    const bad = { ...fixture(), theme: 'neon' } as unknown as AppData;
    expect(saveData(bad).ok).toBe(false);
    expect(() => exportData(bad)).toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
});

describe('导入边界', () => {
  it.each([
    ['未来版本', (data: any) => { data.version = 2; }],
    ['旧版本', (data: any) => { data.version = 0; }],
    ['缺少字段', (data: any) => { delete data.theme; }],
    ['额外字段', (data: any) => { data.extra = true; }],
    ['重复收藏', (data: any) => { data.favorites.push(data.favorites[0]); }],
    ['危险 ID', (data: any) => { data.favorites = ['../x']; }],
    ['重复记录', (data: any) => { data.records.push(data.records[0]); }],
    ['越界电量', (data: any) => { data.records[0].checkIn.energy = 0; }],
    ['字符串电量', (data: any) => { data.records[0].checkIn.energy = '1'; }],
    ['非法时长', (data: any) => { data.records[0].checkIn.minutes = 2; }],
    ['非法耗能源', (data: any) => { data.records[0].checkIn.drain = 'other'; }],
    ['非法结果', (data: any) => { data.records[0].outcome = 'success'; }],
    ['缺少反馈', (data: any) => { delete data.records[0].feedback; }],
    ['越界反馈', (data: any) => { data.records[0].feedback = 3; }],
    ['负时长', (data: any) => { data.records[0].actualSeconds = -1; }],
    ['时长超过间隔', (data: any) => { data.records[0].actualSeconds = 62; }],
    ['结束早于开始', (data: any) => { data.records[0].endedAt = '2026-09-21T00:00:00.000Z'; }],
    ['不存在的日期', (data: any) => { data.records[0].startedAt = '2026-02-30T00:00:00.000Z'; }],
    ['过长备注', (data: any) => { data.records[0].note = '字'.repeat(2001); }],
    ['非文本备注', (data: any) => { data.records[0].note = {}; }],
  ])('%s 返回错误且不写入', (_name, mutate) => {
    const data = fixture();
    mutate(data);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const result = parseImport(JSON.stringify(data));
    expect(result.error).toBeTruthy();
    expect(result.data).toBeUndefined();
    expect(write).not.toHaveBeenCalled();
  });
  it('拒绝超长文本、超多记录和收藏', () => {
    expect(parseImport(' '.repeat(2_000_001)).error).toBeTruthy();
    expect(parseImport(JSON.stringify({ ...fixture(), records: Array(10001).fill(null) })).error).toBeTruthy();
    expect(parseImport(JSON.stringify({ ...fixture(), favorites: Array.from({ length: 1001 }, (_, i) => `a${i}`) })).error).toBeTruthy();
  });
  it('接受备注边界、零时长停止、未知但合法的动作 ID，不丢历史', () => {
    const data = fixture();
    data.records[0].note = '字'.repeat(2000);
    data.records[0].actualSeconds = 0;
    data.records[0].outcome = 'stopped';
    data.records[0].activityId = 'retired-activity';
    expect(parseImport(exportData(data))).toEqual({ data });
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Activity, AppData, ChargingAppProps, SaveData } from '../contracts';
import ChargingApp from './ChargingApp';

const activity: Activity = { id: 'test-rest', title: '靠窗休息', kind: 'relax', drains: ['unsure'], effort: 'low', environment: '找个能坐下的地方', variants: { 1: { intro: '坐一会儿。', steps: ['放松肩膀。'] }, 3: { intro: '慢慢来。', steps: ['看看窗外。'] }, 10: { intro: '休息一会儿。', steps: ['找个舒服的姿势。'] } } };
const empty: AppData = { version: 1, records: [], favorites: [], theme: 'system' };
const englishActivity: Activity = { ...activity, title: 'Rest by the window', environment: 'Somewhere you can sit', variants: {
  1: { intro: 'Sit for a moment.', steps: ['Relax your shoulders.'] }, 3: { intro: 'Take your time.', steps: ['Look outside.'] }, 10: { intro: 'Take a little break.', steps: ['Get comfortable.'] },
} };
const getActivities = (locale: 'zh-CN' | 'en') => [locale === 'en' ? englishActivity : activity];
function setup(overrides: Partial<ChargingAppProps> = {}) {
  const saveData = vi.fn<SaveData>(() => ({ ok: true }));
  const recommend = vi.fn((_check, choices, _records, excluded) => choices.find((item: Activity) => !excluded?.includes(item.id)) ?? null);
  const props: ChargingAppProps = { activities: [activity], initialData: empty, recommend, getInsights: () => [], saveData, exportData: data => JSON.stringify(data), parseImport: () => ({ error: '无效备份' }), ...overrides };
  const view = render(<ChargingApp {...props}/>); return { saveData, recommend, ...view };
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
beforeEach(() => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('zh-CN');
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute('open'); } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('saves early stop with null feedback and retains it when feedback is skipped', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const { saveData } = setup(); click('先跳过，试试一分钟'); click('开始充电');
  act(() => vi.setSystemTime(110_000)); click('提前结束');
  expect(saveData.mock.lastCall?.[0].records[0]).toMatchObject({ outcome: 'stopped', actualSeconds: 10, feedback: null, checkIn: { minutes: 1 } });
  click('跳过反馈');
  expect(saveData.mock.lastCall?.[0].records).toHaveLength(1);
  expect(saveData.mock.lastCall?.[0].records[0].feedback).toBeNull();
});
it('shortens the chosen variant before start and saves explicit zero as zero', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const { saveData } = setup(); click('一格'); click('说不清'); click('10 分钟'); click('帮我选一个'); click('缩为一分钟'); click('开始充电');
  act(() => { vi.setSystemTime(161_000); document.dispatchEvent(new Event('visibilitychange')); });
  click('0 没变化'); click('保存反馈');
  expect(saveData.mock.lastCall?.[0].records[0]).toMatchObject({ outcome: 'completed', actualSeconds: 60, feedback: 0, checkIn: { minutes: 1, energy: 1 } });
});
it('passes exclusions and presents an exhausted state', () => {
  const { recommend } = setup(); click('先跳过，试试一分钟'); click('换一个');
  expect(recommend.mock.lastCall?.[3]).toEqual(['test-rest']);
  expect(screen.getByText('这一轮先看到这里')).toBeVisible();
});
it('retains data after save failure and permits retry', () => {
  const saveData = vi.fn().mockReturnValueOnce({ ok: false, warning: '存储已满' }).mockReturnValue({ ok: true });
  setup({ saveData }); click('先跳过，试试一分钟'); fireEvent.click(screen.getByRole('button', { name: '收藏', pressed: false }));
  expect(screen.getByRole('alert')).toHaveTextContent('存储已满');
  click('重试保存'); expect(saveData.mock.lastCall?.[0].favorites).toEqual(['test-rest']);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('does not overwrite damaged storage before explicit consent', () => {
  const { saveData } = setup({ initialWarning: '原数据无法读取' }); click('设置'); click('夜间');
  expect(saveData).not.toHaveBeenCalled(); click('处理保存问题'); click('取消'); expect(saveData).not.toHaveBeenCalled();
  click('处理保存问题'); click('允许保存'); expect(saveData).toHaveBeenCalledTimes(1);
});
it('cancels clearing without mutating the data', () => {
  const { saveData } = setup({ initialData: { ...empty, favorites: ['test-rest'] } });
  click('设置'); click('清空记录和收藏'); click('取消'); expect(saveData).not.toHaveBeenCalled();
  click('清空记录和收藏'); click('确认清空'); expect(saveData.mock.lastCall?.[0].favorites).toEqual([]);
});
it('validates import and waits for replacement confirmation', async () => {
  const parsed = { ...empty, theme: 'dark' as const, favorites: ['test-rest'] };
  const { saveData } = setup({ parseImport: () => ({ data: parsed }) }); click('设置');
  const file = new File(['{}'], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => '{}' });
  fireEvent.change(screen.getByLabelText('导入备份（JSON 文件）'), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
  expect(saveData).not.toHaveBeenCalled(); click('确认替换'); expect(saveData).toHaveBeenCalledWith(parsed, 'zh-CN');
});

it('defaults an old v1 record without language to the English system locale', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-NZ']);
  setup({ getActivities });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How much energy is left?');
  expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('system');
  expect(document.documentElement.lang).toBe('en');
  click('Skip and try one minute'); expect(screen.getByText('Rest by the window')).toBeVisible();
});

it('saves explicit language from settings and restores it independently of system locale', () => {
  const { saveData, unmount } = setup({ getActivities });
  click('设置'); click('English');
  expect(saveData.mock.lastCall).toEqual([{ ...empty, language: 'en' }, 'en']);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Make yourself comfortable');
  const saved = saveData.mock.lastCall![0]; unmount();
  const next = setup({ initialData: saved, getActivities });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How much energy is left?');
  click('Settings'); click('简体中文');
  expect(next.saveData.mock.lastCall).toEqual([{ ...empty, language: 'zh-CN' }, 'zh-CN']);
  expect(document.documentElement.lang).toBe('zh-CN');
});

it('keeps the active session and paused duration when switching languages', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const { saveData, recommend } = setup({ getActivities });
  click('两格'); click('身体累'); click('帮我选一个'); click('开始充电');
  act(() => { vi.setSystemTime(120_000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.getByRole('timer')).toHaveTextContent('00:40');
  fireEvent.change(screen.getByRole('combobox', { name: /^(界面语言|Language)$/ }), { target: { value: 'en' } });
  expect(screen.getByText('Rest by the window')).toBeVisible();
  expect(screen.getByRole('timer')).toHaveTextContent('00:40');
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('Session progress');
  click('Pause timer');
  fireEvent.change(screen.getByRole('combobox', { name: /^(界面语言|Language)$/ }), { target: { value: 'zh-CN' } });
  act(() => { vi.setSystemTime(200_000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.getByRole('timer')).toHaveTextContent('00:40');
  click('继续计时');
  act(() => { vi.setSystemTime(240_000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(saveData.mock.lastCall![0].records).toHaveLength(1);
  expect(saveData.mock.lastCall![0].records[0]).toMatchObject({ activityId: activity.id, actualSeconds: 60, outcome: 'completed', startedAt: new Date(100_000).toISOString(), checkIn: { energy: 2, drain: 'body', minutes: 1 } });
  expect(recommend).toHaveBeenCalledTimes(1);
});

it('preserves draft and saved personal notes while localizing history and dates', () => {
  const { saveData } = setup({ getActivities });
  click('先跳过，试试一分钟'); click('开始充电'); click('提前结束');
  const note = '今天的风很好。 I want to keep this exact note.';
  fireEvent.change(screen.getByRole('textbox'), { target: { value: note } });
  fireEvent.change(screen.getByRole('combobox', { name: /^(界面语言|Language)$/ }), { target: { value: 'en' } });
  expect(screen.getByRole('textbox')).toHaveValue(note); click('Save feedback');
  expect(saveData.mock.lastCall![0].records[0].note).toBe(note);
  click('View this record'); expect(screen.getByText(note)).toBeVisible();
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Rest by the window');
  expect(document.querySelector('time')?.textContent).toBe(new Date(saveData.mock.lastCall![0].records[0].startedAt).toLocaleString('en', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  fireEvent.change(screen.getByRole('combobox', { name: /^(界面语言|Language)$/ }), { target: { value: 'zh-CN' } });
  expect(screen.getByText(note)).toBeVisible(); expect(saveData.mock.lastCall![0].records).toHaveLength(1);
});

it('follows system language changes without replacing an explicit preference', () => {
  setup();
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
  act(() => window.dispatchEvent(new Event('languagechange')));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How much energy is left?');
  fireEvent.change(screen.getByRole('combobox', { name: /^(界面语言|Language)$/ }), { target: { value: 'zh-CN' } });
  act(() => window.dispatchEvent(new Event('languagechange')));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('先看看，还剩多少电？');
});

it('passes locale to insight and import functions and translates confirmations', async () => {
  const getInsights = vi.fn(() => []);
  const parseImport = vi.fn(() => ({ data: { ...empty, language: 'en' as const } }));
  setup({ getActivities, getInsights, parseImport, initialData: { ...empty, language: 'en' } });
  click('History'); expect(getInsights).toHaveBeenLastCalledWith([], [englishActivity], 'en');
  click('Settings');
  const file = new File(['{}'], 'backup.json'); Object.defineProperty(file, 'text', { value: async () => '{}' });
  fireEvent.change(screen.getByLabelText('Import a backup (JSON file)'), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
  expect(parseImport).toHaveBeenCalledWith('{}', 'en');
  expect(screen.getByRole('dialog')).toHaveTextContent('Replace local data with this backup?');
  expect(screen.getByRole('dialog')).toHaveTextContent('0 records and 0 favorites'); click('Cancel');
  click('Clear records and favorites'); expect(screen.getByRole('dialog')).toHaveTextContent('Clear local records and favorites?');
});

it('uses localized errors after switching away from an initial storage warning', () => {
  const { saveData } = setup({ initialWarning: '本地数据未加载' });
  fireEvent.change(screen.getByRole('combobox', { name: /^(界面语言|Language)$/ }), { target: { value: 'en' } });
  expect(saveData).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('There was a problem loading your data.');
  expect(screen.getByRole('alert')).not.toHaveTextContent('本地数据未加载');
});

it('finishes and saves on HTTP when crypto.randomUUID is unavailable', () => {
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  vi.stubGlobal('crypto', { getRandomValues });
  const { saveData } = setup(); click('先跳过，试试一分钟'); click('开始充电'); click('提前结束');
  expect(saveData.mock.lastCall![0].records[0].id).toMatch(/^[a-zA-Z0-9_-]{1,128}$/);
  expect(saveData.mock.lastCall![0].records[0].outcome).toBe('stopped');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('今天先到这里');
});

it('passes the active locale to export and localizes its result', () => {
  const exportData = vi.fn((data: AppData) => JSON.stringify(data));
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL() { return 'blob:test-export'; } static revokeObjectURL() {} });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  setup({ exportData, initialData: { ...empty, language: 'en' } }); click('Settings'); click('Export data');
  expect(exportData).toHaveBeenCalledWith({ ...empty, language: 'en' }, 'en');
  expect(document.querySelector('.charge-notice')).toHaveTextContent('Export started. Check your downloads for the file.');
});

it('keeps a completion flower through skipped or negative feedback and adds nothing for a stop', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const { saveData } = setup();
  click('先跳过，试试一分钟'); click('开始充电');
  act(() => { vi.setSystemTime(160_000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.getByText('已种下 1 朵花')).toBeVisible();
  expect(screen.getByText('这次休息，让一朵花开了。')).toBeVisible();
  click('跳过反馈'); expect(screen.getByText('已种下 1 朵花')).toBeVisible();
  click('回到充电'); click('先跳过，试试一分钟'); click('开始充电');
  act(() => { vi.setSystemTime(220_000); document.dispatchEvent(new Event('visibilitychange')); });
  click('−1 更累了'); click('保存反馈'); expect(screen.getByText('已种下 2 朵花')).toBeVisible();
  click('回到充电'); click('先跳过，试试一分钟'); click('开始充电'); click('提前结束');
  expect(screen.getByText('已种下 2 朵花')).toBeVisible();
  expect(screen.queryByText('这次休息，让一朵花开了。')).not.toBeInTheDocument();
  expect(saveData.mock.lastCall![0].records).toHaveLength(3);
});

import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { AppData } from '../../src/contracts';
import { gardenBackup, gardenCases } from './garden-fixtures';

test.use({ locale: 'zh-CN' });
const KEY = 'infp-charging:data';
const garden = (page: Page) => page.locator('section.garden');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const stored = (page: Page): Promise<AppData> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY);
async function seed(page: Page, data: AppData) {
  await page.addInitScript(({ key, data }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(data));
  }, { key: KEY, data });
  await page.goto('/');
}
async function start(page: Page) {
  await button(page, '先跳过，试试一分钟').click();
  await button(page, '开始充电').click();
}
async function freezeClock(page: Page) {
  const time = new Date('2026-09-22T10:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
}
async function count(page: Page, total: number, english = false) {
  await expect(garden(page).locator('.garden-flower-count')).toHaveText(english ? `Flowers planted: ${total}` : `已种下 ${total} 朵花`);
  await expect(garden(page).locator('[data-flower=true]')).toHaveCount(Math.min(total, 28));
}
async function noRunningAnimations(page: Page) {
  await expect.poll(() => garden(page).evaluate(element => element.getAnimations({ subtree: true }).filter(a => a.playState === 'running' || a.pending).length)).toBe(0);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const small = await page.locator('button:visible, select:visible').evaluateAll(elements => elements.filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  }).map(element => element.textContent));
  expect(small).toEqual([]);
}

for (const item of gardenCases) {
  test(`花园旧记录映射 ${item.completed} 完成和 ${item.stopped} 停止`, async ({ page }) => {
    const data = gardenBackup(item.completed, item.stopped, true);
    await seed(page, data);
    await count(page, item.completed);
    await expect(garden(page)).toHaveAttribute('data-stage', item.stage);
    await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
    await expect(garden(page).locator('.garden-reward')).toHaveCount(0);
    expect(await stored(page)).toEqual(data);
    await page.getByRole('combobox').selectOption('en');
    await count(page, item.completed, true);
    await expect(garden(page)).toHaveAccessibleName('My riverside garden');
    await page.reload();
    await count(page, item.completed, true);
    await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
    expect((await stored(page)).records).toEqual(data.records);
  });
}

test('花园完整休息仅奖励一次，负反馈、切语言、切页和刷新不重播', async ({ page }) => {
  await freezeClock(page);
  await seed(page, gardenBackup(2, 1));
  await start(page);
  await page.clock.fastForward(60_000);
  await count(page, 3);
  await expect(garden(page)).toHaveAttribute('data-stage', 'seedling');
  await expect(garden(page)).toHaveAttribute('data-bloom', 'active');
  await expect(garden(page).locator('.garden-new-flower')).toHaveCount(1);
  await expect(garden(page).getByRole('status')).toContainText('这次休息，让一朵花开了。');
  await page.clock.fastForward(1700);
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await button(page, '−1 更累了').click();
  await page.getByRole('combobox').selectOption('en');
  await count(page, 3, true);
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await button(page, 'Save feedback').click();
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  const data = await stored(page);
  expect(data.records.filter(record => record.outcome === 'completed')).toHaveLength(3);
  expect(data.records.find(record => record.id !== 'garden-qa-0' && record.id !== 'garden-qa-1' && record.id !== 'garden-qa-2')).toMatchObject({ feedback: -1, actualSeconds: 60 });
  await page.getByRole('navigation').getByRole('button', { name: 'History', exact: true }).click();
  await count(page, 3, true);
  await page.getByRole('navigation').getByRole('button', { name: 'Recharge', exact: true }).click();
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await page.reload();
  await count(page, 3, true);
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await expect(garden(page).locator('.garden-reward')).toHaveCount(0);
});

test('花园连续两次完成均奖励，跳过反馈仍种花，提前结束不扣花', async ({ page }) => {
  await freezeClock(page);
  await seed(page, gardenBackup(0));
  for (const total of [1, 2]) {
    await start(page);
    await page.clock.fastForward(60_000);
    await count(page, total);
    await expect(garden(page)).toHaveAttribute('data-bloom', 'active');
    await page.clock.fastForward(1700);
    await button(page, '跳过反馈').click();
    await count(page, total);
    await button(page, '回到充电').click();
  }
  await start(page);
  await page.clock.fastForward(10_000);
  await button(page, '提前结束').click();
  await count(page, 2);
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await expect(garden(page).locator('.garden-kind-note')).toContainText('已有的花一朵也不会少');
  await expect(garden(page).locator('.garden-reward')).toHaveCount(0);
  await button(page, '+2 好很多').click();
  await button(page, '保存反馈').click();
  const records = (await stored(page)).records;
  expect(records.filter(r => r.outcome === 'completed' && r.feedback === null)).toHaveLength(2);
  expect(records.filter(r => r.outcome === 'stopped' && r.feedback === 2)).toHaveLength(1);
  await count(page, 2);
});

test('花园动态可键盘暂停且不干扰业务计时和语言切换', async ({ page }) => {
  await freezeClock(page);
  await seed(page, gardenBackup(6));
  const motion = button(page, '暂停花园动态');
  await motion.focus();
  await page.keyboard.press('Enter');
  await expect(garden(page)).toHaveAttribute('data-motion', 'paused');
  await noRunningAnimations(page);
  await start(page);
  await page.clock.fastForward(10_000);
  await expect(page.getByRole('timer')).toHaveText('00:50');
  await button(page, '暂停计时').click();
  await page.getByRole('combobox').selectOption('en');
  await expect(garden(page)).toHaveAttribute('data-motion', 'paused');
  await button(page, 'Play garden motion').click();
  await page.clock.fastForward(20_000);
  await expect(page.getByRole('timer')).toHaveText('00:50');
  await button(page, 'Pause garden motion').click();
  await button(page, 'Resume timer').click();
  await page.clock.fastForward(50_000);
  await count(page, 7, true);
  await expect(garden(page)).toHaveAttribute('data-stage', 'youngTree');
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await noRunningAnimations(page);
  expect((await stored(page)).records.filter(r => !r.id.startsWith('garden-qa-'))).toEqual([expect.objectContaining({ actualSeconds: 60, outcome: 'completed' })]);
});

test('花园初始及运行中减少动态均停止所有动画，完成仍有静态奖励', async ({ page }) => {
  await freezeClock(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page, gardenBackup(13));
  await expect(button(page, '动态已减少')).toBeDisabled();
  await noRunningAnimations(page);
  await start(page);
  await page.clock.fastForward(60_000);
  await count(page, 14);
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await expect(garden(page).getByRole('status')).toBeVisible();
  await noRunningAnimations(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(garden(page)).toHaveAttribute('data-motion', 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(garden(page)).toHaveAttribute('data-motion', 'paused');
  await noRunningAnimations(page);
});

test('花园真实旧备份导入可取消，确认后映射且不奖励', async ({ page }) => {
  await seed(page, gardenBackup(1));
  await button(page, '设置').click();
  const backup = gardenBackup(35, 5, true);
  const file = { name: 'garden-old-v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) };
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  expect((await stored(page)).records).toHaveLength(1);
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: '确认替换', exact: true }).click();
  await button(page, '返回充电').click();
  await count(page, 35);
  await expect(garden(page)).toHaveAttribute('data-stage', 'canopy');
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  await expect(garden(page).locator('.garden-reward')).toHaveCount(0);
  expect((await stored(page)).records).toEqual(backup.records);
});

for (const width of [320, 375, 390, 430]) {
  test(`花园 ${width}px 双语日夜布局及200%文字`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await seed(page, gardenBackup(35));
    if (width === 320) await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    for (const locale of ['zh-CN', 'en']) {
      await page.getByRole('combobox').selectOption(locale);
      await noOverflow(page);
      await expect(garden(page).locator('.garden-landscape')).toHaveAttribute('aria-hidden', 'true');
      await expect(garden(page).locator('.garden-landscape')).toHaveAttribute('focusable', 'false');
      await button(page, locale === 'en' ? 'Settings' : '设置').click();
      await button(page, locale === 'en' ? 'Dark' : '夜间').click();
      await button(page, locale === 'en' ? 'Back to recharge' : '返回充电').click();
      await noOverflow(page);
      await expect(garden(page).locator('.garden-moon')).toBeVisible();
    }
    await page.getByRole('combobox').selectOption('zh-CN');
    await start(page);
    await noOverflow(page);
    await button(page, '提前结束').click();
    await noOverflow(page);
  });
}

test('花园离线完成后刷新保留花朵，无外部请求', async ({ page, context }) => {
  await freezeClock(page);
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4187') external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await seed(page, gardenBackup(2));
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await start(page);
  await page.clock.fastForward(60_000);
  await count(page, 3);
  await button(page, '跳过反馈').click();
  await page.reload();
  await count(page, 3);
  await expect(garden(page)).toHaveAttribute('data-bloom', 'idle');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('花园真实日夜及英文交付截图', async ({ page }) => {
  await mkdir('docs/release/evidence', { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, gardenBackup(14));
  await button(page, '暂停花园动态').click();
  await page.screenshot({ path: 'docs/release/evidence/garden-home-zh-390.png', fullPage: true });
  await page.getByRole('combobox').selectOption('en');
  await page.screenshot({ path: 'docs/release/evidence/garden-home-en-390.png', fullPage: true });
  await button(page, 'Settings').click();
  await button(page, 'Dark').click();
  await button(page, 'Back to recharge').click();
  await page.screenshot({ path: 'docs/release/evidence/garden-night-en-390.png', fullPage: true });
});

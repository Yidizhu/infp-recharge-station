import { test, expect, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gardenBackup } from './garden-fixtures';

const KEY = 'infp-charging:data';
test.use({ locale: 'zh-CN' });
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function start(page: Page) {
  await button(page, '先跳过，试试一分钟').click();
  await button(page, '开始充电').click();
}

test('真实推荐、暂停、完成、反馈和刷新持久化', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await start(page);
  await page.clock.fastForward(10_000);
  await button(page, '暂停计时').click();
  const paused = await page.getByRole('timer').textContent();
  await page.clock.fastForward(20_000);
  await expect(page.getByRole('timer')).toHaveText(paused!);
  await button(page, '继续计时').click();
  // One large clock jump exercises the real timestamp-based catch-up path.
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('这段时间留给了自己');
  await button(page, '0 没变化').click();
  await page.getByRole('textbox').fill('窗边休息 / by the window');
  await button(page, '保存反馈').click();
  const data = await stored(page);
  expect(data.records).toHaveLength(1);
  expect(data.records[0]).toMatchObject({ outcome: 'completed', actualSeconds: 60, feedback: 0, note: '窗边休息 / by the window' });
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '记录', exact: true }).click();
  await expect(page.getByText('窗边休息 / by the window', { exact: true })).toBeVisible();
});

test('切换语言保留计时和个人备注并持久化选择', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await start(page);
  await page.clock.fastForward(8_000);
  await button(page, '暂停计时').click();
  const remaining = await page.getByRole('timer').textContent();
  await page.getByRole('combobox', { name: '界面语言' }).selectOption('en');
  await expect(page.getByRole('timer')).toHaveText(remaining!);
  await expect(button(page, 'Resume timer')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await button(page, 'End early').click();
  await page.getByRole('textbox').fill('不翻译我的备注 — keep this');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-CN');
  await expect(page.getByRole('textbox')).toHaveValue('不翻译我的备注 — keep this');
  await button(page, '保存反馈').click();
  expect((await stored(page)).records[0]).toMatchObject({ outcome: 'stopped', feedback: null, note: '不翻译我的备注 — keep this' });
  await page.getByRole('combobox', { name: '界面语言' }).selectOption('en');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  await page.getByRole('navigation').getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('不翻译我的备注 — keep this', { exact: true })).toBeVisible();
});

test('收藏、导出、导入取消与清空取消不改数据', async ({ page }) => {
  await page.goto('/');
  await button(page, '先跳过，试试一分钟').click();
  await page.locator('.activity-card').getByRole('button').click();
  const original = await stored(page);
  expect(original.favorites).toHaveLength(1);
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '收藏', exact: true }).click();
  await expect(button(page, '看看这个动作')).toBeVisible();
  await button(page, '设置').click();
  const downloadEvent = page.waitForEvent('download');
  await button(page, '导出数据').click();
  const download = await downloadEvent;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(original);
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, records: [], favorites: [], theme: 'dark', language: 'en' })) });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  expect(await stored(page)).toEqual(original);
  await button(page, '清空记录和收藏').click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await stored(page)).toEqual(original);
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, records: [], favorites: [], theme: 'dark', language: 'en' })) });
  await page.getByRole('dialog').getByRole('button', { name: '确认替换', exact: true }).click();
  await expect(page.locator('.charging-app')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  expect((await stored(page)).favorites).toEqual([]);
});

test('损坏原存储不会被收藏或语言选择静默覆盖', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken-json'), KEY);
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await button(page, '先跳过，试试一分钟').click();
  await page.locator('.activity-card').getByRole('button').click();
  await page.getByRole('combobox', { name: '界面语言' }).selectOption('en');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{broken-json');
  await button(page, 'Resolve save issue').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{broken-json');
});

test('浏览器存储写入失败时记录保留内存并可重试', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, '__restoreStorage', { value: () => { Storage.prototype.setItem = original; }, configurable: true });
    Storage.prototype.setItem = () => { throw new DOMException('Test quota exhausted', 'QuotaExceededError'); };
  });
  await start(page);
  await button(page, '提前结束').click();
  await page.getByRole('textbox').fill('内存里的记录不可丢');
  await button(page, '保存反馈').click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await stored(page)).toBeNull();
  await button(page, '看看这次记录').click();
  await expect(page.getByText('内存里的记录不可丢', { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as unknown as { __restoreStorage: () => void }).__restoreStorage(); });
  await button(page, '重试保存').click();
  await expect(page.getByRole('alert')).not.toBeVisible();
  expect((await stored(page)).records[0].note).toBe('内存里的记录不可丢');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '记录', exact: true }).click();
  await expect(page.getByText('内存里的记录不可丢', { exact: true })).toBeVisible();
});

test('保存真实窄屏中英文交付截图', async ({ page }) => {
  await mkdir('docs/release/evidence', { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'docs/release/evidence/01-home-zh-390.png', fullPage: true });
  await button(page, '先跳过，试试一分钟').click();
  await page.screenshot({ path: 'docs/release/evidence/02-activity-zh-390.png', fullPage: true });
  await page.getByRole('combobox', { name: '界面语言' }).selectOption('en');
  await page.screenshot({ path: 'docs/release/evidence/03-activity-en-390.png', fullPage: true });
  await button(page, 'Start recharging').click();
  await page.screenshot({ path: 'docs/release/evidence/04-timer-en-390.png', fullPage: true });
});

test('换卡耗尽可恢复、三分钟可缩短', async ({ page }) => {
  await page.goto('/');
  await button(page, '两格').click();
  await button(page, '身体累').click();
  await button(page, '3 分钟').click();
  await button(page, '帮我选一个').click();
  await button(page, '缩为一分钟').click();
  await expect(page.locator('.card-top')).toContainText('1 分钟');
  const seen: string[] = [];
  while (await button(page, '换一个').count()) {
    const title = await page.locator('.activity-card h2').innerText();
    expect(seen).not.toContain(title);
    seen.push(title);
    expect(seen.length).toBeLessThanOrEqual(24);
    await button(page, '换一个').click();
  }
  await expect(page.getByText('这一轮先看到这里', { exact: true })).toBeVisible();
  await button(page, '重新看看').click();
  await expect(button(page, '开始充电')).toBeVisible();
});

for (const width of [320, 375, 390, 430]) {
  test(`${width}px 中英文、200%文字与键盘入口`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused();
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    for (const locale of ['en', 'zh-CN']) {
      await page.getByRole('combobox').selectOption(locale);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const tooSmall = await page.locator('button:visible, select:visible').evaluateAll(elements => elements.filter(element => { const rect = element.getBoundingClientRect(); return rect.width < 43 || rect.height < 43; }).map(element => element.textContent));
      expect(tooSmall).toEqual([]);
    }
    await button(page, '先跳过，试试一分钟').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await startFromCard();
    async function startFromCard() {
      await button(page, '开始充电').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await button(page, '提前结束').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
    await button(page, '跳过反馈').click();
    await button(page, '设置').click();
    await button(page, '夜间').click();
    await expect(page.locator('.charging-app')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await button(page, '夜间').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
    await button(page, '清空记录和收藏').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('真实产物首次缓存后断网重开、离线记录及同源请求', async ({ page, context }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await start(page);
  await button(page, '提前结束').click();
  await button(page, '跳过反馈').click();
  expect((await stored(page)).records).toHaveLength(1);
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '记录', exact: true }).click();
  await expect(page.locator('.record-list li')).toHaveCount(1);
  expect(requests.filter(url => new URL(url).origin !== new URL(page.url()).origin)).toEqual([]);
  expect(errors).toEqual([]);
  await context.setOffline(false);
});

test('激活只清理自身旧缓存并保留本机数据', async ({ page }) => {
  // Open a non-app same-origin document first, before production registration.
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async key => {
    localStorage.setItem(key, JSON.stringify({ version: 1, records: [], favorites: ['detached-legacy-id'], theme: 'dark', language: 'en' }));
    await caches.open('infp-charging-static-old-test');
    await caches.open('unrelated-cache-must-stay');
  }, KEY);
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  const keys = await page.evaluate(() => caches.keys());
  expect(keys).not.toContain('infp-charging-static-old-test');
  expect(keys).toContain('unrelated-cache-must-stay');
  expect((await stored(page)).favorites).toEqual(['detached-legacy-id']);
});

test('实际 worker 版本升级等待旧窗口关闭且保留用户数据', async ({ browser }) => {
  // Serve the built files unchanged except RELEASE, emulating two deployments.
  let release = 'upgrade-test-1';
  const root = resolve('dist');
  const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url!, 'http://localhost').pathname);
      const file = resolve(root, pathname === '/' ? 'index.html' : pathname.slice(1));
      if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      let body = await readFile(file);
      if (pathname === '/sw.js') body = Buffer.from(body.toString().replace(/const RELEASE = '[^']+';/, `const RELEASE = '${release}';`));
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test origin unavailable');
  const origin = `http://127.0.0.1:${address.port}`;
  const context = await browser.newContext({ locale: 'zh-CN' });
  try {
    const page = await context.newPage();
    await page.goto(origin);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const preserved = { ...gardenBackup(14, 3, true), favorites: ['preserved-favorite'], theme: 'dark' as const, language: 'en' as const };
    await page.evaluate(async ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
      await caches.open('unrelated-upgrade-cache');
    }, { key: KEY, data: preserved });
    release = 'upgrade-test-2';
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration!.update(); });
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
    expect(await page.evaluate(() => caches.keys())).toContain('infp-charging-static-upgrade-test-1');
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(origin);
    await expect.poll(() => reopened.evaluate(() => caches.keys())).not.toContain('infp-charging-static-upgrade-test-1');
    const keys = await reopened.evaluate(() => caches.keys());
    expect(keys).toContain('infp-charging-static-upgrade-test-2');
    expect(keys).toContain('unrelated-upgrade-cache');
    expect((await stored(reopened)).favorites).toEqual(['preserved-favorite']);
    expect((await stored(reopened)).records).toEqual(preserved.records);
    await expect(reopened.locator('.garden-flower-count')).toHaveText('Flowers planted: 14');
    await expect(reopened.locator('section.garden')).toHaveAttribute('data-stage', 'canopy');
    await expect(reopened.locator('section.garden')).toHaveAttribute('data-bloom', 'idle');
    await context.setOffline(true);
    await reopened.reload();
    await expect(reopened.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
    await expect(reopened.locator('.garden-flower-count')).toHaveText('Flowers planted: 14');
    await expect(reopened.locator('section.garden')).toHaveAttribute('data-bloom', 'idle');
  } finally {
    await context.close();
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
  }
});

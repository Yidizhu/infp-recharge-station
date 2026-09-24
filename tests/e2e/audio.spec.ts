import { test, expect } from '@playwright/test';

test.use({ locale: 'zh-CN' });

test('真实音乐播放、切换音轨、双语与手机布局', async ({ page }) => {
  await page.goto('/');
  await page.locator('.soundscape summary').click();
  await page.getByRole('combobox', { name: '自然声音', exact: true }).selectOption('off');
  await page.getByRole('button', { name: '播放声音', exact: true }).click();
  await expect(page.locator('.soundscape-status')).toHaveText('声音播放中');
  await page.getByRole('combobox', { name: '背景音乐', exact: true }).selectOption('night');
  await expect(page.locator('.soundscape-status')).toHaveText('声音播放中');
  await page.getByLabel('界面语言').selectOption('en');
  await expect(page.locator('.soundscape-status')).toHaveText('Sounds playing');
  await page.getByRole('button', { name: 'Pause sounds', exact: true }).click();
  await expect(page.locator('.soundscape-status')).toHaveText('Sounds paused');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'docs/release/evidence/audio-panel-en-390.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.soundscape summary')).toContainText('Quiet by default');
});

test('新名称、默认无音频下载，已请求音轨可离线分段读取', async ({ page, context }) => {
  const audioRequests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.mp3')) audioRequests.push(request.url()); });
  await page.goto('/');
  await expect(page).toHaveTitle('INFP的充电站');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(audioRequests).toEqual([]);
  const online = await page.evaluate(async () => {
    const r = await fetch('/audio/ambient-leaves-loop.mp3');
    return { status: r.status, length: (await r.arrayBuffer()).byteLength };
  });
  expect(online.status).toBe(200);
  expect(online.length).toBeGreaterThan(1000);
  await context.setOffline(true);
  const offline = await page.evaluate(async () => {
    const r = await fetch('/audio/ambient-leaves-loop.mp3', { headers: { Range: 'bytes=0-99' } });
    return { status: r.status, length: (await r.arrayBuffer()).byteLength, range: r.headers.get('Content-Range') };
  });
  expect(offline).toEqual({ status: 206, length: 100, range: `bytes 0-99/${online.length}` });
  await page.reload();
  await expect(page).toHaveTitle('INFP的充电站');
  await page.getByLabel('界面语言').selectOption('en');
  await expect(page).toHaveTitle('INFP Recharge Station');
});

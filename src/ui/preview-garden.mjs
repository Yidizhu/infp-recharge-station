// Isolated visual self-review; C owns the final integrated browser acceptance suite.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('./__qa__/evidence/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('.garden').waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('garden-empty-day.png', out)), fullPage: true });
  await page.evaluate(() => {
    const record = i => ({ id: `qa-garden-${i}`, activityId: 'qa-rest', startedAt: '2026-09-01T01:00:00.000Z', endedAt: '2026-09-01T01:01:00.000Z', checkIn: { energy: 1, drain: 'unsure', minutes: 1 }, actualSeconds: 60, outcome: 'completed', feedback: null, note: '' });
    localStorage.setItem('infp-charging:data', JSON.stringify({ version: 1, records: Array.from({ length: 14 }, (_, i) => record(i)), favorites: [], theme: 'light', language: 'zh-CN' }));
  });
  await page.reload(); await page.locator('.garden[data-stage="canopy"]').waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('garden-grown-day.png', out)), fullPage: true });
  await page.evaluate(() => { const data = JSON.parse(localStorage.getItem('infp-charging:data')); data.theme = 'dark'; data.language = 'en'; localStorage.setItem('infp-charging:data', JSON.stringify(data)); });
  await page.reload(); await page.locator('.garden[data-stage="canopy"]').waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('garden-grown-night.png', out)), fullPage: true });
  await page.setViewportSize({ width: 320, height: 812 });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw Error('Garden page overflows at 320px / 200% text');
  console.log('Garden self-review screenshots saved; 320px/200% English page has no horizontal overflow.');
} finally { await browser.close(); }

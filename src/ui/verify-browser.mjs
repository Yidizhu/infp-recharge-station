// Component QA only: injected fixtures never enter the production application.
// Requires the existing Vite server on 127.0.0.1:5173 and installed Edge.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const output = new URL('./__qa__/evidence/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce', locale: 'zh-CN' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const checks = [];
const button = name => page.getByRole('button', { name, exact: true });
async function mount() {
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(async () => {
    const [{ default: ChargingApp }, reactModule, domModule] = await Promise.all([
      import('/src/ui/ChargingApp.tsx'), import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
    ]);
    const variants = { 1: { intro: '让目光停在窗外，不用想出什么答案。', steps: ['找一个舒服的位置，松开肩膀。', '看看窗外的光线，让这一分钟慢慢过去。'] }, 3: { intro: '给自己一点安静。', steps: ['坐稳，看看窗外。'] }, 10: { intro: '暂时放下手边的事。', steps: ['找一个舒服的位置。'] } };
    const activities = [{ id: 'qa-window', title: '在窗边，坐一小会儿', kind: 'relax', drains: ['unsure'], effort: 'low', environment: '室内 · 有窗的地方', variants }];
    const englishActivities = [{ ...activities[0], title: 'Sit by the window for a moment', environment: 'Indoors, near a window', variants: {
      1: { intro: 'Rest your eyes on the view. There is nothing to work out.', steps: ['Find a comfortable seat and relax your shoulders.', 'Notice the light outside. Let this minute pass slowly.'] },
      3: { intro: 'Take a quiet moment.', steps: ['Sit comfortably and look outside.'] },
      10: { intro: 'Put your tasks aside for a little while.', steps: ['Find a comfortable spot.'] },
    } }];
    const React = reactModule.default ?? reactModule;
    const { createRoot } = domModule.default ?? domModule;
    const empty = { version: 1, records: [], favorites: [], theme: 'system' };
    const initialData = JSON.parse(sessionStorage.getItem('A-component-QA') || 'null') || empty;
    const root = document.createElement('div'); document.body.replaceChildren(root);
    createRoot(root).render(React.createElement(ChargingApp, {
      activities, initialData, getActivities: locale => locale === 'en' ? englishActivities : activities,
      recommend: (_check, pool, _records, excluded = []) => pool.find(item => !excluded.includes(item.id)) || null,
      getInsights: () => [],
      saveData: data => { sessionStorage.setItem('A-component-QA', JSON.stringify(data)); return { ok: true }; },
      exportData: data => JSON.stringify(data),
      parseImport: json => { try { const data = JSON.parse(json); return data.version === 1 && Array.isArray(data.records) && Array.isArray(data.favorites) ? { data } : { error: '无效备份' }; } catch { return { error: '无效备份' }; } },
    }));
  });
  await page.getByRole('combobox').waitFor();
}
async function layout(label) {
  const result = await page.evaluate(() => {
    const bad = [...document.querySelectorAll('button')].filter(el => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(el => el.textContent);
    return { overflow: document.documentElement.scrollWidth > innerWidth, bad };
  });
  assert.equal(result.overflow, false, `${label} horizontal overflow`);
  assert.deepEqual(result.bad, [], `${label} touch target`);
  checks.push(`${label}: no horizontal overflow, all buttons >=44px`);
}
try {
  await mount();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '跳到主要内容');
  checks.push('Keyboard skip link is first focus target');
  await button('两格').click(); await button('脑内循环').click();
  for (const width of [320, 375, 390, 430, 812]) {
    await page.setViewportSize({ width, height: width === 812 ? 375 : 812 });
    await layout(`checkin ${width}px`);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: fileURLToPath(new URL('checkin-light.png', output)), fullPage: true });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.setViewportSize({ width: 320, height: 812 }); await layout('checkin 320px 200% text');
  await page.evaluate(() => document.documentElement.style.fontSize = '');
  await page.setViewportSize({ width: 375, height: 812 });
  await button('帮我选一个').click(); await layout('activity card');
  await page.screenshot({ path: fileURLToPath(new URL('activity-light.png', output)), fullPage: true });
  await page.locator('.activity-card').getByRole('button', { name: '收藏', exact: true }).click();
  await button('开始充电').click(); await button('暂停计时').click();
  const paused = await page.getByRole('timer').textContent();
  await page.waitForTimeout(1100); assert.equal(await page.getByRole('timer').textContent(), paused);
  await button('继续计时').click(); await button('提前结束').click();
  await layout('feedback'); await button('跳过反馈').click(); await button('看看这次记录').click();
  assert.match(await page.locator('.record-list').innerText(), /提前结束/);
  checks.push('Pause/resume/early stop and skipped feedback visible in history');
  await mount(); await button('记录').click(); assert.equal(await page.locator('.record-list > li').count(), 1);
  checks.push('Record reload through injected persistence adapter');
  await button('设置').click(); await button('夜间').click();
  await layout('dark settings');
  await button('清空记录和收藏').click(); await page.getByRole('dialog').waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '取消');
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0);
  checks.push('Native dialog opens on Cancel and Escape dismisses');
  await button('返回充电').click();
  await page.screenshot({ path: fileURLToPath(new URL('checkin-dark.png', output)), fullPage: true });
  await button('先跳过，试试一分钟').click(); await button('开始充电').click();
  await page.screenshot({ path: fileURLToPath(new URL('timer-dark.png', output)), fullPage: true });
  const transition = await button('暂停计时').evaluate(el => getComputedStyle(el).transitionDuration);
  assert.equal(transition, '0s'); checks.push('Reduced motion disables button transitions');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.setViewportSize({ width: 320, height: 812 }); await layout('timer 320px 200% text');
  await button('提前结束').click(); await layout('feedback 320px 200% text');
  await button('跳过反馈').click(); await button('设置').click(); await layout('settings 320px 200% text');
  await button('清空记录和收藏').click(); await layout('dialog 320px 200% text'); await button('取消').click();
  await page.getByRole('combobox').selectOption('en');
  await layout('English settings 320px 200% text');
  await button('Clear records and favorites').click(); await layout('English dialog 320px 200% text'); await button('Cancel').click();
  await button('Back to recharge').click(); await button('Back to recharge').click();
  await button('2 bars').click(); await button('Thoughts on repeat').click();
  await layout('English checkin 320px 200% text');
  await page.evaluate(() => document.documentElement.style.fontSize = '');
  for (const width of [320, 375, 430, 812]) {
    await page.setViewportSize({ width, height: width === 812 ? 375 : 812 }); await layout(`English checkin ${width}px`);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: fileURLToPath(new URL('checkin-english.png', output)), fullPage: true });
  await button('Pick something for me').click();
  assert.equal(await page.getByRole('heading', { level: 2 }).textContent(), 'Sit by the window for a moment');
  await button('Start recharging').click(); await button('Pause timer').click();
  const englishPaused = await page.getByRole('timer').textContent();
  await page.getByRole('combobox').selectOption('zh-CN');
  assert.equal(await page.getByRole('timer').textContent(), englishPaused); await button('继续计时').waitFor();
  await page.getByRole('combobox').selectOption('en');
  assert.equal(await page.getByRole('timer').textContent(), englishPaused);
  await page.screenshot({ path: fileURLToPath(new URL('timer-english.png', output)), fullPage: true });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.setViewportSize({ width: 320, height: 812 }); await layout('English timer 320px 200% text');
  await button('End early').click(); await layout('English feedback 320px 200% text');
  await page.getByRole('textbox').fill('保留这句备注. Keep this exact note.');
  await page.getByRole('combobox').selectOption('zh-CN');
  assert.equal(await page.getByRole('textbox').inputValue(), '保留这句备注. Keep this exact note.');
  await page.getByRole('combobox').selectOption('en'); await button('Save feedback').click(); await button('View this record').click();
  await layout('English history 320px 200% text');
  assert.equal(await page.locator('.record-note').last().textContent(), '保留这句备注. Keep this exact note.');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  checks.push('English UI and activity copy; paused timer, record and note preserved across language changes');
  assert.deepEqual(errors, []); checks.push('No browser page errors');
  console.log(JSON.stringify(checks, null, 2));
  await writeFile(new URL('browser-checks.json', output), JSON.stringify({ browser: browser.version(), scope: 'Injected fixture component QA; not A/B integration or physical-device QA', checks }, null, 2));
} finally { await browser.close(); }

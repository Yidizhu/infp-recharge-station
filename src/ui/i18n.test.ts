import source from './ChargingApp.tsx?raw';
import gardenSource from './Garden.tsx?raw';
import { expect, it, vi } from 'vitest';
import { english, getSystemLocale, translate } from './i18n';

it('detects Chinese regional locales and otherwise defaults to English', () => {
  for (const [language, expected] of [['zh-TW', 'zh-CN'], ['zh-Hans', 'zh-CN'], ['en-NZ', 'en'], ['fr', 'en']]) {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([language]);
    expect(getSystemLocale()).toBe(expected);
  }
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue([]);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('zh-CN');
  expect(getSystemLocale()).toBe('zh-CN');
});

it('has English translations for all Chinese UI messages', () => {
  const messages = [...`${source}\n${gardenSource}`.matchAll(/'([^'\n]*[\u3400-\u9fff][^'\n]*)'/g)].map(match => match[1]);
  for (const message of messages) {
    if (message === '简体中文') continue; // Language names stay in their own language.
    expect(english, `Missing translation: ${message}`).toHaveProperty(message);
  }
});

it('preserves interpolation placeholders in both languages', () => {
  for (const [message, translated] of Object.entries(english)) {
    expect([...translated.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()).toEqual([...message.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort());
  }
  expect(translate('en', '剩余 {seconds} 秒', { seconds: 42 })).toBe('42 seconds remaining');
});

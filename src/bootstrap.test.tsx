import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';

import { STORAGE_KEY } from './storage/store';

afterEach(() => vi.restoreAllMocks());

it('connects the real recommendation, session and persistence modules', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
  const view = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '先跳过，试试一分钟' }));
  fireEvent.click(screen.getByRole('button', { name: '开始充电' }));
  fireEvent.click(screen.getByRole('button', { name: '提前结束' }));
  fireEvent.click(screen.getByRole('button', { name: '跳过反馈' }));
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  expect(saved.records).toHaveLength(1);
  expect(saved.records[0]).toMatchObject({ outcome: 'stopped', feedback: null, checkIn: { minutes: 1 } });
  fireEvent.click(screen.getByRole('button', { name: '看看这次记录' }));
  expect(screen.getByRole('heading', { name: '我的充电记录' })).toBeInTheDocument();
  expect(screen.getByText(/提前结束，实际/)).toBeInTheDocument();
  view.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '记录' }));
  expect(screen.getByText(/提前结束，实际/)).toBeInTheDocument();
});

it('keeps unreadable stored data intact while a session runs in memory', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
  const broken = '{broken-backup';
  localStorage.setItem(STORAGE_KEY, broken);
  render(<App />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '先跳过，试试一分钟' }));
  fireEvent.click(screen.getByRole('button', { name: '开始充电' }));
  fireEvent.click(screen.getByRole('button', { name: '提前结束' }));
  fireEvent.click(screen.getByRole('button', { name: '跳过反馈' }));
  expect(localStorage.getItem(STORAGE_KEY)).toBe(broken);
  expect(screen.getByText('这次记录暂留在页面里，请先处理上方的保存提示。')).toBeInTheDocument();
});

it('loads real English activities and persists a language switch across reloads', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, records: [], favorites: [], theme: 'system', language: 'en' }));
  const view = render(<App />);
  expect(screen.getByRole('heading', { name: 'How much energy is left?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Skip and try one minute' }));
  expect(screen.getByRole('heading', { name: 'Notice the colors around you' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'zh-CN' } });
  expect(document.documentElement.lang).toBe('zh-CN');
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).language).toBe('zh-CN');
  view.unmount();
  render(<App />);
  expect(screen.getByRole('heading', { name: '先看看，还剩多少电？' })).toBeInTheDocument();
});

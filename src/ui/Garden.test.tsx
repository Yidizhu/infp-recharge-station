import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { SessionRecord } from '../contracts';
import Garden from './Garden';
import { getGardenState } from './gardenState';

const completed = (index = 0): SessionRecord => ({ id: `legacy-${index}`, activityId: 'test-rest', startedAt: '2026-09-01T01:00:00.000Z', endedAt: '2026-09-01T01:01:00.000Z', checkIn: { energy: 1, drain: 'unsure', minutes: 1 }, actualSeconds: 60, outcome: 'completed', feedback: null, note: '' });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('maps old completed records to flowers independent of feedback and ignores stops', () => {
  const records = [completed(), { ...completed(1), feedback: -1 as const }, { ...completed(2), feedback: 0 as const }, { ...completed(3), outcome: 'stopped' as const, feedback: 2 as const }];
  expect(getGardenState(records)).toEqual({ flowers: 3, visibleFlowers: 3, stage: 'seedling' });
  expect(records[0]).not.toHaveProperty('garden');
});
it.each([[0, 'meadow'], [2, 'meadow'], [3, 'seedling'], [6, 'seedling'], [7, 'youngTree'], [13, 'youngTree'], [14, 'canopy'], [100, 'canopy']])('shows the right stage for %i completed breaks', (count, stage) => {
  expect(getGardenState(Array.from({ length: Number(count) }, (_, i) => completed(i))).stage).toBe(stage);
});
it('limits drawn flowers while keeping the full count and old records do not animate a reward', () => {
  const records = Array.from({ length: 99 }, (_, i) => completed(i));
  const { container } = render(<Garden records={records} locale="zh-CN" reward={null}/>);
  expect(screen.getByText('已种下 99 朵花')).toBeVisible();
  expect(container.querySelectorAll('[data-flower]')).toHaveLength(28);
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
  expect(container.querySelector('.garden-landscape')).toHaveAttribute('aria-hidden', 'true');
});
it('blooms once for a new completion and never replays on language changes or rerender', () => {
  vi.useFakeTimers();
  const { rerender, container } = render(<Garden records={[]} locale="zh-CN" reward={null}/>);
  const reward = { recordId: 'new-record', total: 1 };
  rerender(<Garden records={[completed()]} locale="zh-CN" reward={reward}/>);
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'active');
  act(() => vi.advanceTimersByTime(800));
  rerender(<Garden records={[completed()]} locale="en" reward={reward}/>);
  expect(screen.getByText('A flower opened for this break.')).toBeVisible();
  act(() => vi.advanceTimersByTime(800));
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
  rerender(<Garden records={[completed()]} locale="zh-CN" reward={reward}/>);
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
});
it('pauses all garden motion without changing records and does not replay an interrupted bloom', () => {
  const { rerender, container } = render(<Garden records={[]} locale="en" reward={null}/>);
  rerender(<Garden records={[completed()]} locale="en" reward={{ recordId: 'new-record', total: 1 }}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Pause garden motion' }));
  expect(container.querySelector('.garden')).toHaveAttribute('data-motion', 'paused');
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
  fireEvent.click(screen.getByRole('button', { name: 'Play garden motion' }));
  expect(container.querySelector('.garden')).toHaveAttribute('data-motion', 'running');
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
  expect(screen.getByText('Flowers planted: 1')).toBeVisible();
});
it('clears an interrupted bloom on navigation and never replays the same reward on return', () => {
  vi.useFakeTimers();
  const records = [completed()];
  const reward = { recordId: 'new-record', total: 1 };
  const { rerender, container } = render(<Garden records={[]} locale="zh-CN" reward={null}/>);
  rerender(<Garden records={records} locale="zh-CN" reward={reward}/>);
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'active');
  act(() => vi.advanceTimersByTime(100));
  rerender(<Garden records={records} locale="zh-CN" reward={null}/>);
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
  rerender(<Garden records={records} locale="en" reward={reward}/>);
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
  act(() => vi.advanceTimersByTime(2000));
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
});
it('respects reduced motion on load and suppresses the bloom while keeping reward text', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const { rerender, container } = render(<Garden records={[]} locale="en" reward={null}/>);
  rerender(<Garden records={[completed()]} locale="en" reward={{ recordId: 'new-record', total: 1 }}/>);
  expect(screen.getByRole('button', { name: 'Motion reduced' })).toBeDisabled();
  expect(container.querySelector('.garden')).toHaveAttribute('data-motion', 'paused');
  expect(container.querySelector('.garden')).toHaveAttribute('data-bloom', 'idle');
  expect(screen.getByText('A flower opened for this break.')).toBeVisible();
});
it('gives a calm stopped message without removing any existing flowers', () => {
  render(<Garden records={[completed()]} locale="en" reward={null} stopped/>);
  expect(screen.getByText('Flowers planted: 1')).toBeVisible();
  expect(screen.getByText('That’s enough for now. Your garden is here, and every flower stays.')).toBeVisible();
  expect(screen.queryByText('A flower opened for this break.')).not.toBeInTheDocument();
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Soundscape from './Soundscape';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = ''; preload = ''; loop = false; volume = 1; onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve()); pause = vi.fn(); load = vi.fn();
  removeAttribute = vi.fn();
  constructor() { FakeAudio.instances.push(this); }
}
beforeEach(() => { FakeAudio.instances = []; vi.stubGlobal('Audio', FakeAudio); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const open = () => fireEvent.click(screen.getByText('Listen by the river'));
const start = async () => { await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Play sounds' }))); };

it('does not create or download media until play, including when choosing tracks', async () => {
  render(<Soundscape locale="en"/>); open();
  fireEvent.change(screen.getByLabelText('Background music'), { target: { value: 'night' } });
  expect(FakeAudio.instances).toHaveLength(0);
  await start();
  expect(FakeAudio.instances.map(audio => audio.src)).toEqual(['/audio/music-garden-night.mp3', '/audio/ambient-river-loop.mp3']);
  expect(FakeAudio.instances.every(audio => audio.preload === 'none')).toBe(true);
  expect(FakeAudio.instances[0].volume).toBe(.25);
});
it('pauses when hidden, stays paused on return and resumes only on a click', async () => {
  render(<Soundscape locale="en"/>); open(); await start();
  act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(FakeAudio.instances.every(audio => audio.pause.mock.calls.length > 0)).toBe(true);
  act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(FakeAudio.instances).toHaveLength(2);
  await start(); expect(FakeAudio.instances).toHaveLength(4);
});
it('offers retry after rejected play, without leaving another channel running', async () => {
  class RejectAudio extends FakeAudio { play = vi.fn(() => Promise.reject(new Error('blocked'))); }
  vi.stubGlobal('Audio', RejectAudio);
  render(<Soundscape locale="en"/>); open(); await start();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  expect(FakeAudio.instances.every(audio => audio.pause.mock.calls.length > 0)).toBe(true);
  vi.stubGlobal('Audio', FakeAudio);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
  expect(screen.getByRole('button', { name: 'Pause sounds' })).toBeEnabled();
});
it('does not start a reward for an old event or replay it on locale changes', async () => {
  const old = { recordId: 'old', total: 2 };
  const { rerender } = render(<Soundscape locale="en" reward={old}/>); open();
  fireEvent.click(screen.getByRole('checkbox')); await start();
  expect(FakeAudio.instances).toHaveLength(2);
  await act(async () => rerender(<Soundscape locale="en" reward={{ recordId: 'new', total: 3 }}/>));
  expect(FakeAudio.instances[2].src).toBe('/audio/sfx-tree-grow.mp3');
  rerender(<Soundscape locale="zh-CN" reward={{ recordId: 'new', total: 3 }}/>);
  expect(FakeAudio.instances).toHaveLength(3);
});
it('ends the reward within two seconds and turning effects off cancels it', async () => {
  vi.useFakeTimers();
  const { rerender } = render(<Soundscape locale="en"/>); open();
  fireEvent.click(screen.getByRole('checkbox')); await start();
  await act(async () => rerender(<Soundscape locale="en" reward={{ recordId: 'one', total: 1 }}/>));
  const bloom = FakeAudio.instances[2]; expect(bloom.src).toBe('/audio/sfx-flower-bloom.mp3');
  act(() => vi.advanceTimersByTime(1800)); expect(bloom.volume).toBeLessThan(.35);
  act(() => vi.advanceTimersByTime(200)); expect(bloom.pause).toHaveBeenCalled();
  await act(async () => rerender(<Soundscape locale="en" reward={{ recordId: 'two', total: 2 }}/>));
  fireEvent.click(screen.getByRole('checkbox')); expect(FakeAudio.instances[3].pause).toHaveBeenCalled();
});
it('changing volume does not recreate or restart a track and unmount releases audio', async () => {
  const { unmount } = render(<Soundscape locale="en"/>); open(); await start();
  fireEvent.change(screen.getByRole('slider', { name: /Music volume/ }), { target: { value: '12' } });
  expect(FakeAudio.instances[0].volume).toBe(.12); expect(FakeAudio.instances).toHaveLength(2);
  unmount(); expect(FakeAudio.instances.every(audio => audio.pause.mock.calls.length > 0)).toBe(true);
});
it('ignores a late play result after the user has paused', async () => {
  let resolve!: () => void;
  class PendingAudio extends FakeAudio { play = vi.fn(() => new Promise<void>(done => { resolve = done; })); }
  vi.stubGlobal('Audio', PendingAudio);
  render(<Soundscape locale="en"/>); open();
  fireEvent.change(screen.getByLabelText('Nature sounds'), { target: { value: 'off' } });
  await start();
  fireEvent.click(screen.getByRole('button', { name: 'Pause sounds' }));
  await act(async () => resolve());
  expect(screen.getByRole('button', { name: 'Play sounds' })).toBeEnabled();
  expect(FakeAudio.instances[0].pause.mock.calls.length).toBeGreaterThan(1);
});
it('turning both channels off stays quiet, and a later selection still needs play', async () => {
  render(<Soundscape locale="en"/>); open(); await start();
  fireEvent.change(screen.getByLabelText('Background music'), { target: { value: 'off' } });
  fireEvent.change(screen.getByLabelText('Nature sounds'), { target: { value: 'off' } });
  await act(async () => {});
  expect(screen.getByRole('button', { name: 'Play sounds' })).toBeDisabled();
  const created = FakeAudio.instances.length;
  fireEvent.change(screen.getByLabelText('Nature sounds'), { target: { value: 'birds' } });
  expect(FakeAudio.instances).toHaveLength(created);
  await start(); expect(FakeAudio.instances.at(-1)?.src).toBe('/audio/ambient-birds-loop.mp3');
});
it('a media download failure stops the mix and offers a retry', async () => {
  render(<Soundscape locale="en"/>); open(); await start();
  act(() => FakeAudio.instances[0].onerror?.());
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  expect(FakeAudio.instances[1].pause).toHaveBeenCalled();
});

import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSessionTimer } from './useSessionTimer';

afterEach(() => vi.useRealTimers());
it('reconciles background time and completes once at the real deadline', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const finish = vi.fn();
  const { result } = renderHook(() => useSessionTimer(finish));
  act(() => result.current.start(60));
  act(() => { vi.setSystemTime(190_000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(finish).toHaveBeenCalledExactlyOnceWith(60, true, 100_000, 160_000);
  act(() => { result.current.stop(); window.dispatchEvent(new Event('focus')); });
  expect(finish).toHaveBeenCalledTimes(1);
});
it('excludes a long pause and records an early stop accurately', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const finish = vi.fn();
  const { result } = renderHook(() => useSessionTimer(finish));
  act(() => result.current.start(60));
  act(() => { vi.setSystemTime(112_500); result.current.toggle(); });
  expect(result.current.paused).toBe(true);
  act(() => { vi.setSystemTime(312_500); window.dispatchEvent(new Event('focus')); });
  expect(result.current.remaining).toBe(48);
  expect(finish).not.toHaveBeenCalled();
  act(() => result.current.toggle());
  act(() => { vi.setSystemTime(320_000); result.current.stop(); });
  expect(finish).toHaveBeenCalledExactlyOnceWith(20, false, 100_000, 320_000);
});
it('treats a stop after the deadline as completed', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const finish = vi.fn(); const { result } = renderHook(() => useSessionTimer(finish));
  act(() => result.current.start(60));
  act(() => { vi.setSystemTime(161_000); result.current.stop(); });
  expect(finish).toHaveBeenCalledExactlyOnceWith(60, true, 100_000, 160_000);
});

import { useCallback, useEffect, useRef, useState } from 'react';

interface Clock { elapsed: number; since: number | null; target: number; startedAt: number }
/** Intervals repaint only. Elapsed time always comes from timestamps. */
export function useSessionTimer(onFinish: (seconds: number, completed: boolean, start: number, end: number) => void) {
  const clock = useRef<Clock | null>(null);
  const finishCallback = useRef(onFinish);
  finishCallback.current = onFinish;
  const [display, setDisplay] = useState({ remaining: 0, paused: false });
  const elapsedAt = (c: Clock, now: number) => c.elapsed + (c.since === null ? 0 : Math.max(0, now - c.since));
  const sync = useCallback((stop = false) => {
    const c = clock.current;
    if (!c) return;
    const now = Date.now();
    const elapsed = elapsedAt(c, now);
    if (elapsed >= c.target || stop) {
      clock.current = null; // prevents duplicate saves from visibility and interval events
      const completed = elapsed >= c.target;
      const end = completed && c.since !== null ? c.since + Math.max(0, c.target - c.elapsed) : now;
      finishCallback.current(Math.floor(Math.min(elapsed, c.target) / 1000), completed, c.startedAt, end);
      setDisplay({ remaining: 0, paused: false });
    } else setDisplay({ remaining: Math.ceil((c.target - elapsed) / 1000), paused: c.since === null });
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => sync(), 250);
    const visible = () => sync();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); };
  }, [sync]);
  return {
    ...display,
    start(seconds: number) {
      const now = Date.now();
      clock.current = { elapsed: 0, since: now, target: seconds * 1000, startedAt: now };
      sync();
    },
    toggle() {
      sync();
      const c = clock.current;
      if (!c) return;
      const now = Date.now();
      if (c.since === null) c.since = now;
      else { c.elapsed = elapsedAt(c, now); c.since = null; }
      sync();
    },
    stop() { sync(true); },
  };
}

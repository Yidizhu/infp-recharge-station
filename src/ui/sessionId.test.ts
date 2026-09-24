import { afterEach, expect, it, vi } from 'vitest';
import { createSessionId } from './sessionId';

afterEach(() => vi.unstubAllGlobals());
it('uses native UUID when available', () => {
  const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');
  vi.stubGlobal('crypto', { randomUUID });
  expect(createSessionId()).toBe('11111111-1111-4111-8111-111111111111');
  expect(randomUUID).toHaveBeenCalledOnce();
});
it('creates distinct valid record IDs when randomUUID is unavailable on HTTP', () => {
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  vi.stubGlobal('crypto', { getRandomValues });
  const ids = Array.from({ length: 100 }, createSessionId);
  expect(new Set(ids).size).toBe(100);
  ids.forEach(id => expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/));
});
it('still creates unique schema-compatible IDs without any Web Crypto', () => {
  vi.stubGlobal('crypto', undefined);
  const ids = Array.from({ length: 100 }, createSessionId);
  expect(new Set(ids).size).toBe(100);
  ids.forEach(id => expect(id).toMatch(/^[a-zA-Z0-9_-]{1,128}$/));
});

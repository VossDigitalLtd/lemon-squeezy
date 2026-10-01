import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock CacheManager before importing rateLimit, since rateLimit
// uses CacheManager internally and we want an isolated in-memory store.
vi.mock('@/lib/supabase/core', () => ({
  CacheManager: {
    getInstance: () => {
      const store = new Map<string, unknown>();
      return {
        get: (key: string) => store.get(key) ?? null,
        set: (key: string, value: unknown) => store.set(key, value),
      };
    },
  },
}));

import { rateLimit } from '@/lib/rateLimit';

describe('rateLimit()', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  it('allows requests within the limit', () => {
    const key = 'test:allow';
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    }
  });

  it('blocks requests that exceed the limit', () => {
    const key = 'test:block';
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false);
  });

  it('allows requests again after the window expires', () => {
    const key = 'test:window';
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);

    // Advance past the 60s window
    vi.setSystemTime(new Date('2024-01-01T00:01:01Z'));
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
  });
});

/**
 * Simple in-process sliding window rate limiter.
 *
 * Backed by CacheManager — no external dependencies required.
 *
 * IMPORTANT: This works correctly for single-process deployments (local dev,
 * single serverless instance). For multi-instance production (Vercel with
 * concurrent instances), replace the CacheManager store with Upstash Redis.
 * See docs/architecture/caching.md for guidance.
 *
 * Usage:
 *   const { allowed, remaining } = rateLimit(`rl:${userId}:invite`, 20, 10 * 60 * 1000);
 *   if (!allowed) return apiError('Too many requests', 429);
 */

import { CacheManager } from '@/lib/supabase/core/CacheManager';

export interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check and increment a rate limit counter.
 *
 * @param key       Unique key identifying the actor + action, e.g. `rl:userId:invite`
 * @param limit     Maximum number of requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const cache = CacheManager.getInstance();
  const now = Date.now();
  const resetAt = now + windowMs;

  const current = cache.get<number>(key) ?? 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment — preserve the original TTL by only setting on first hit
  if (current === 0) {
    cache.set(key, 1, windowMs);
  } else {
    // CacheManager.set resets the TTL; we store count with a fresh window
    // (acceptable approximation — a true sliding window requires timestamps)
    cache.set(key, current + 1, windowMs);
  }

  return { allowed: true, remaining: limit - (current + 1), resetAt };
}

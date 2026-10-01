'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CacheManager } from '@/lib/supabase/core';

interface UseCachedFetchOptions {
  /** Cache key. If omitted the response is not cached. */
  cacheKey?: string;
  /** Cache TTL in milliseconds. Defaults to 5 minutes. */
  cacheTTL?: number;
  /** Extra values that trigger a re-fetch when they change (like useEffect deps). */
  dependencies?: unknown[];
  /** Set to true to skip the fetch entirely (e.g. while waiting for required params). */
  skip?: boolean;
}

interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True when the current data was served from cache rather than a network request. */
  isFromCache: boolean;
  /** Force a fresh network request, bypassing the cache. */
  refresh: () => void;
}

/**
 * Fetches a JSON API endpoint with optional client-side caching via CacheManager.
 *
 * - Always sends `Cache-Control: no-store` so the browser never serves a stale response.
 * - Results are cached in-process (CacheManager) for the specified TTL.
 * - Cancels in-flight requests on unmount or when deps change.
 *
 * @example
 * const { data, loading, error, refresh } = useCachedFetch<{ data: User[] }>(
 *   '/api/users',
 *   { cacheKey: `users:${page}`, cacheTTL: 60_000, dependencies: [page] }
 * );
 */
export function useCachedFetch<T>(
  url: string,
  options: UseCachedFetchOptions = {}
): UseCachedFetchResult<T> {
  const { cacheKey, cacheTTL = 300_000, dependencies = [], skip = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const cache = CacheManager.getInstance();

  const refresh = useCallback(() => {
    if (cacheKey) cache.delete(cacheKey);
    setRefreshTick((n) => n + 1);
  }, [cache, cacheKey]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }

    // Serve from cache if available (and this isn't a forced refresh)
    if (cacheKey && refreshTick === 0) {
      const cached = cache.get(cacheKey) as T | null;
      if (cached !== null && cached !== undefined) {
        setData(cached);
        setIsFromCache(true);
        setLoading(false);
        return;
      }
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setIsFromCache(false);

    fetch(url, { cache: 'no-store', signal: abortRef.current.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((json) => {
        setData(json);
        if (cacheKey) cache.set(cacheKey, json, cacheTTL);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, cacheKey, cacheTTL, skip, refreshTick, ...dependencies]);

  return { data, loading, error, isFromCache, refresh };
}

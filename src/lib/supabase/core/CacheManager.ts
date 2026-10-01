/**
 * CacheManager - Unified caching for Supabase services
 *
 * Provides consistent caching with pattern-based invalidation,
 * performance monitoring, and memory management.
 *
 * Usage:
 *   const cache = CacheManager.getInstance();
 *   cache.set('key', data, 60000); // Cache for 1 minute
 *   const data = cache.get('key');
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  cleanups: number;
  hitRate?: number;
  currentSize?: number;
  maxSize?: number;
}

export class CacheManager {
  private static instance: CacheManager | null = null;

  private cache: Map<string, CacheEntry>;
  private accessTimes: Map<string, number>;
  private options: Required<CacheOptions>;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.accessTimes = new Map();
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 300000, // 5 minutes
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
    };

    // Statistics tracking
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0,
    };

    // Start cleanup interval (only in browser/long-running processes)
    if (typeof window !== 'undefined') {
      this.startCleanup();
    }
  }

  /**
   * Singleton instance
   */
  static getInstance(options: CacheOptions = {}): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(options);
    }
    return CacheManager.instance;
  }

  /**
   * Get value from cache
   */
  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access time for LRU
    this.accessTimes.set(key, Date.now());
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set<T = unknown>(key: string, value: T, ttl: number = this.options.defaultTTL): void {
    // Ensure we don't exceed max size
    if (this.cache.size >= this.options.maxSize) {
      this._evictOldest();
    }

    const expiresAt = Date.now() + ttl;
    const accessTime = Date.now();

    this.cache.set(key, { value, expiresAt, createdAt: accessTime });
    this.accessTimes.set(key, accessTime);
    this.stats.sets++;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessTimes.delete(key);

    if (deleted) {
      this.stats.deletes++;
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessTimes.clear();
    this.stats.deletes += size;
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
    );

    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        deletedCount++;
      }
    }

    this.stats.deletes += deletedCount;
    return deletedCount;
  }

  /**
   * Get cache with automatic setting if not found
   */
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.options.defaultTTL
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; currentSize: number; maxSize: number } {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      currentSize: this.cache.size,
      maxSize: this.options.maxSize,
    };
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this._cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clean up expired entries
   */
  private _cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
      }
    }

    this.stats.cleanups++;
  }

  /**
   * Evict oldest entries when cache is full (LRU)
   */
  private _evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessTimes.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}

export default CacheManager;

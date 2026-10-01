/**
 * BaseQueryService - Unified pagination and querying foundation for Supabase
 *
 * Provides consistent API for pagination, searching, filtering, and caching
 * across all Supabase services. Designed to work with Supabase Auth + RLS.
 *
 * Key features:
 * - Uses Supabase Auth (auth.uid()) for RLS policies
 * - No need to pass userId explicitly - RLS handles access control
 * - Server client respects the authenticated user's session
 *
 * Usage:
 *   class ItemService extends BaseQueryService {
 *     constructor() {
 *       super('items', {
 *         searchFields: ['title', 'description'],
 *         defaultOrderBy: 'created_at'
 *       });
 *     }
 *   }
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CacheManager } from './CacheManager';
import {
  validatePagination,
  validateRequiredParams,
  classifySupabaseError,
  sanitizeString,
} from '../utils/validation';

// Types
interface ServiceOptions {
  defaultOrderBy?: string;
  defaultOrderDirection?: 'asc' | 'desc';
  defaultLimit?: number;
  searchFields?: string[];
  enableCache?: boolean;
  cacheTTL?: number;
  useSoftDelete?: boolean;
  userIdColumn?: string;
}

interface QueryOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
  includeTotalCount?: boolean;
  select?: string;
  includeDeleted?: boolean;
  deletedOnly?: boolean;
}

interface ParsedOptions extends QueryOptions {
  page: number;
  limit: number;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
  search: string;
  filters: Record<string, unknown>;
  includeTotalCount: boolean;
  select: string;
}

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  offset: number;
}

interface SuccessResult<T> {
  success: true;
  data: T;
  pagination?: PaginationInfo;
}

interface ErrorResult {
  success: false;
  error: string;
}

type ServiceResult<T> = SuccessResult<T> | ErrorResult;

export class BaseQueryService {
  protected tableName: string;
  protected cache: CacheManager;
  protected defaultOptions: Required<ServiceOptions>;

  constructor(tableName: string, defaultOptions: ServiceOptions = {}) {
    this.tableName = tableName;
    this.cache = CacheManager.getInstance();

    // Default configuration
    this.defaultOptions = {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      defaultLimit: 25,
      searchFields: ['title', 'description'],
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      useSoftDelete: false,
      userIdColumn: 'id',
      ...defaultOptions,
    };
  }

  /**
   * Unified pagination and querying method
   * RLS policies handle access control automatically
   */
  async findMany<T = unknown>(
    supabase: SupabaseClient,
    options: QueryOptions = {}
  ): Promise<ServiceResult<T[]>> {
    try {
      const queryOptions = this._parseOptions(options);
      const paginationValidation = validatePagination(queryOptions);

      if (!paginationValidation.valid) {
        return { success: false, error: paginationValidation.errors?.join(', ') || 'Invalid pagination' };
      }

      // Generate cache key (includes user from session)
      const { data: { user } } = await supabase.auth.getUser();
      const cacheKey = this._generateCacheKey('findMany', user?.id || 'anon', queryOptions);

      // Try cache first
      if (this.defaultOptions.enableCache) {
        const cached = this.cache.get<ServiceResult<T[]>>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Build and execute query
      const result = await this._executeQuery<T>(supabase, queryOptions);

      // Cache result if successful
      if (this.defaultOptions.enableCache && result.success) {
        this.cache.set(cacheKey, result, this.defaultOptions.cacheTTL);
      }

      return result;
    } catch (error) {
      console.error(`[${this.constructor.name}] findMany error:`, error);
      const err = error as Error;
      return {
        success: false,
        error: err?.message || classifySupabaseError(error as { code?: string; message?: string })?.message || 'Query failed',
      };
    }
  }

  /**
   * Find single record by ID
   * RLS policies handle access control automatically
   */
  async findById<T = unknown>(
    supabase: SupabaseClient,
    id: string,
    options: { select?: string } = {}
  ): Promise<ServiceResult<T>> {
    try {
      const validation = validateRequiredParams({ id }, ['id']);
      if (!validation.valid) {
        return { success: false, error: validation.details || 'Missing required parameters' };
      }

      const { data: { user } } = await supabase.auth.getUser();
      const cacheKey = this._generateCacheKey('findById', user?.id || 'anon', { id, ...options });

      if (this.defaultOptions.enableCache) {
        const cached = this.cache.get<ServiceResult<T>>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      let query = supabase
        .from(this.tableName)
        .select(options.select || '*')
        .eq('id', id);

      // Apply soft delete filter if enabled
      if (this.defaultOptions.useSoftDelete) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Record not found' };
        }
        throw error;
      }

      const result: SuccessResult<T> = { success: true, data: data as T };

      if (this.defaultOptions.enableCache) {
        this.cache.set(cacheKey, result, this.defaultOptions.cacheTTL);
      }

      return result;
    } catch (error) {
      console.error(`[${this.constructor.name}] findById error:`, error);
      return {
        success: false,
        error: classifySupabaseError(error as { code?: string; message?: string })?.message || 'Record not found',
      };
    }
  }

  /**
   * Create a new record
   */
  async create<T = unknown>(
    supabase: SupabaseClient,
    data: Record<string, unknown>
  ): Promise<ServiceResult<T>> {
    try {
      const { data: record, error } = await supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Invalidate list caches
      const { data: { user } } = await supabase.auth.getUser();
      this.invalidateCache(user?.id);

      return { success: true, data: record as T };
    } catch (error) {
      console.error(`[${this.constructor.name}] create error:`, error);
      return {
        success: false,
        error: classifySupabaseError(error as { code?: string; message?: string })?.message || 'Failed to create record',
      };
    }
  }

  /**
   * Update a record by ID
   */
  async update<T = unknown>(
    supabase: SupabaseClient,
    id: string,
    data: Record<string, unknown>
  ): Promise<ServiceResult<T>> {
    try {
      const { data: record, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Invalidate caches
      const { data: { user } } = await supabase.auth.getUser();
      this.invalidateCache(user?.id);

      return { success: true, data: record as T };
    } catch (error) {
      console.error(`[${this.constructor.name}] update error:`, error);
      return {
        success: false,
        error: classifySupabaseError(error as { code?: string; message?: string })?.message || 'Failed to update record',
      };
    }
  }

  /**
   * Delete a record by ID (or soft delete if enabled)
   */
  async delete(supabase: SupabaseClient, id: string): Promise<ServiceResult<null>> {
    try {
      let error;

      if (this.defaultOptions.useSoftDelete) {
        // Soft delete
        ({ error } = await supabase
          .from(this.tableName)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id));
      } else {
        // Hard delete
        ({ error } = await supabase
          .from(this.tableName)
          .delete()
          .eq('id', id));
      }

      if (error) {
        throw error;
      }

      // Invalidate caches
      const { data: { user } } = await supabase.auth.getUser();
      this.invalidateCache(user?.id);

      return { success: true, data: null };
    } catch (error) {
      console.error(`[${this.constructor.name}] delete error:`, error);
      return {
        success: false,
        error: classifySupabaseError(error as { code?: string; message?: string })?.message || 'Failed to delete record',
      };
    }
  }

  /**
   * Parse and normalize query options
   */
  protected _parseOptions(options: QueryOptions): ParsedOptions {
    return {
      page: Math.max(1, parseInt(String(options.page)) || 1),
      limit: Math.min(100, Math.max(1, parseInt(String(options.limit)) || this.defaultOptions.defaultLimit)),
      orderBy: options.orderBy || this.defaultOptions.defaultOrderBy,
      orderDirection: ['asc', 'desc'].includes(options.orderDirection || '')
        ? (options.orderDirection as 'asc' | 'desc')
        : this.defaultOptions.defaultOrderDirection,
      search: sanitizeString(options.search || ''),
      filters: options.filters || {},
      includeTotalCount: options.includeTotalCount !== false,
      select: options.select || '*',
      includeDeleted: options.includeDeleted,
      deletedOnly: options.deletedOnly,
    };
  }

  /**
   * Execute the main query with filtering, searching, and pagination
   */
  protected async _executeQuery<T>(
    supabase: SupabaseClient,
    options: ParsedOptions
  ): Promise<ServiceResult<T[]>> {
    const offset = (options.page - 1) * options.limit;

    // Build base query - RLS handles user filtering
    let query = supabase
      .from(this.tableName)
      .select(options.select, { count: options.includeTotalCount ? 'exact' : undefined });

    // Apply soft delete filter
    if (this.defaultOptions.useSoftDelete) {
      if (options.includeDeleted && options.deletedOnly) {
        query = query.not('deleted_at', 'is', null);
      } else if (!options.includeDeleted) {
        query = query.is('deleted_at', null);
      }
    }

    // Apply search
    if (options.search) {
      query = this._addSearch(query, options.search);
    }

    // Apply filters
    query = this._addFilters(query, options.filters);

    // Apply custom filters (override in subclasses)
    query = this._addCustomFilters(query, options);

    // Apply ordering
    query = query.order(options.orderBy, { ascending: options.orderDirection === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + options.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / options.limit);

    return {
      success: true,
      data: (data || []) as T[],
      pagination: {
        currentPage: options.page,
        pageSize: options.limit,
        totalCount,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPrevPage: options.page > 1,
        offset,
      },
    };
  }

  /**
   * Add search conditions to query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _addSearch(query: any, searchTerm: string): any {
    if (!searchTerm || this.defaultOptions.searchFields.length === 0) {
      return query;
    }

    const searchConditions = this.defaultOptions.searchFields
      .map((field) => `${field}.ilike.%${searchTerm}%`)
      .join(',');

    return query.or(searchConditions);
  }

  /**
   * Add filters to query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _addFilters(query: any, filters: Record<string, unknown>): any {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' && value !== 'all') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
    return query;
  }

  /**
   * Add service-specific custom filters
   * Override in subclasses
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  protected _addCustomFilters(query: any, options: ParsedOptions): any {
    return query;
  }

  /**
   * Generate cache key
   */
  protected _generateCacheKey(method: string, userId: string, params: object): string {
    const key = `${this.tableName}:${method}:${userId}:${JSON.stringify(params)}`;
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Invalidate cache for this service
   */
  invalidateCache(userId?: string | null, pattern: string = '*'): void {
    const cachePattern = `${this.tableName}:*:${userId || '*'}:*${pattern}*`;
    this.cache.invalidatePattern(cachePattern);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

export default BaseQueryService;

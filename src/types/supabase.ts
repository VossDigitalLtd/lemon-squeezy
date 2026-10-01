import { SupabaseClient } from '@supabase/supabase-js';

// Base Supabase client type
// TODO: Replace with generated Database types from `supabase gen types typescript`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedSupabaseClient = SupabaseClient<any>;

// Profile table type
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  role: UserRole;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'user' | 'editor' | 'admin' | 'super_admin';

// Base query service options
export interface BaseQueryServiceOptions {
  searchFields?: string[];
  defaultOrderBy?: string;
  defaultOrderDirection?: 'asc' | 'desc';
  useSoftDelete?: boolean;
  enableCache?: boolean;
  cacheTTL?: number;
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  select?: string;
}

// Pagination result
export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Storage upload result
export interface StorageUploadResult {
  path: string | null;
  url: string | null;
  error: string | null;
}

// File validation options
export interface FileValidationOptions {
  allowedTypes?: string[];
  maxSize?: number;
}

// Cache entry
export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

// Cache stats
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  currentSize: number;
  maxSize: number;
}

// Service response types
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedServiceResponse<T = unknown> extends ServiceResponse<T[]> {
  pagination?: PaginationResult;
}

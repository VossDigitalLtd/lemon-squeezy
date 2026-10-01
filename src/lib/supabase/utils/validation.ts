// lib/supabase/utils/validation.ts

export const ERROR_CODES = {
  UNKNOWN_ERROR: 'unknown-error',
  VALIDATION_ERROR: 'validation-error',
  UNAUTHORIZED: 'unauthorized',
  NOT_FOUND: 'not-found',
  DUPLICATE_ENTRY: 'duplicate-entry',
  INVALID_INPUT: 'invalid-input',
  NETWORK_ERROR: 'network-error',
  PERMISSION_DENIED: 'permission-denied',
  DUPLICATE_KEY: 'duplicate-key',
  DATABASE_ERROR: 'database-error',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

interface ValidationResult {
  valid: boolean;
  error: boolean;
  details?: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
    timestamp: string;
  };
}

interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

interface ClassifiedError {
  code: ErrorCode;
  message: string;
}

interface PaginationValidationResult {
  valid: boolean;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    orderBy: string;
    orderDirection: 'asc' | 'desc';
    offset: number;
  };
}

interface SupabaseError {
  code?: string;
  message?: string;
}

/**
 * Validate required parameters
 */
export function validateRequiredParams(
  params: Record<string, unknown>,
  required: string[]
): ValidationResult {
  const missing: string[] = [];

  for (const param of required) {
    if (params[param] === undefined || params[param] === null || params[param] === '') {
      missing.push(param);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      error: true,
      details: `Missing required parameters: ${missing.join(', ')}`,
    };
  }

  return { valid: true, error: false };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details: unknown = null
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T = unknown>(data: T = null as T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Classify Supabase errors into standardized error codes
 */
export function classifySupabaseError(error: SupabaseError | null): ClassifiedError {
  if (!error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: 'Unknown error occurred',
    };
  }

  // Check for specific Supabase/PostgreSQL error codes
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
        return { code: ERROR_CODES.NOT_FOUND, message: 'Resource not found' };
      case '23505':
        return { code: ERROR_CODES.DUPLICATE_KEY, message: 'Duplicate entry detected' };
      case '42501':
        return { code: ERROR_CODES.PERMISSION_DENIED, message: 'Insufficient permissions' };
      case '08006':
      case '08001':
        return { code: ERROR_CODES.NETWORK_ERROR, message: 'Database connection failed' };
      case '22P02':
      case '23502':
        return { code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid input data' };
    }
  }

  // Check for specific error messages
  const message = error.message?.toLowerCase() || '';

  if (message.includes('not found') || message.includes('no rows')) {
    return { code: ERROR_CODES.NOT_FOUND, message: 'Resource not found' };
  }

  if (message.includes('duplicate') || message.includes('already exists')) {
    return { code: ERROR_CODES.DUPLICATE_ENTRY, message: 'Resource already exists' };
  }

  if (message.includes('permission') || message.includes('unauthorized')) {
    return { code: ERROR_CODES.PERMISSION_DENIED, message: 'Access denied' };
  }

  if (message.includes('network') || message.includes('connection')) {
    return { code: ERROR_CODES.NETWORK_ERROR, message: 'Network connection error' };
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: error.message || 'An unexpected error occurred',
  };
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Validate pagination parameters
 */
export function validatePagination(options: PaginationOptions = {}): PaginationValidationResult {
  const {
    page = 1,
    limit = 20,
    orderBy = 'created_at',
    orderDirection = 'desc',
  } = options;

  const errors: string[] = [];

  if (typeof page !== 'number' || page < 1 || page > 10000) {
    errors.push('Page must be a number between 1 and 10000');
  }

  if (typeof limit !== 'number' || limit < 1 || limit > 100) {
    errors.push('Limit must be a number between 1 and 100');
  }

  if (typeof orderBy !== 'string' || orderBy.trim().length === 0) {
    errors.push('OrderBy must be a non-empty string');
  }

  if (!['asc', 'desc'].includes(orderDirection)) {
    errors.push('OrderDirection must be either "asc" or "desc"');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    pagination: {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      orderBy: orderBy.trim(),
      orderDirection,
      offset: (page - 1) * limit,
    },
  };
}

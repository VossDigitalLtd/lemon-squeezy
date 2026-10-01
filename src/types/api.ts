import { PaginationResult } from './supabase';

// Generic API success response
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

// Generic API error response
export interface ApiErrorResponse {
  success: false;
  error: string;
}

// Combined API response type
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Paginated API response
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationResult;
}

// Type guard for success response
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

// Type guard for error response
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

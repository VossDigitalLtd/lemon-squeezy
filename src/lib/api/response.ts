/**
 * API response helpers for Next.js Route Handlers.
 *
 * Every response sets `Cache-Control: private, no-store` to prevent browsers
 * and CDNs from caching user-specific data. Use these helpers in all route
 * handlers instead of calling NextResponse.json() directly.
 *
 * For expensive, non-user-specific data (e.g. public content lists), consider
 * enabling server-side caching via BaseQueryService's `enableCache` option
 * instead — that caches at the service layer, not the HTTP layer.
 */

import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

/**
 * Successful response. Defaults to HTTP 200.
 *
 * @example
 * return ok({ data: result.data });
 * return ok({ data: result.data, pagination: result.pagination });
 * return ok({ data: result.data }, 201);
 */
export function ok<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

/**
 * Error response.
 *
 * @example
 * return apiError('Authentication required', 401);
 * return apiError('Internal server error', 500);
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

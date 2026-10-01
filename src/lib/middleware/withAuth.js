// Authentication middleware for API routes
// Validates Supabase sessions and extracts authenticated user information

import { createClient } from '../supabase/server';
import { NextResponse } from 'next/server';

/**
 * Authentication middleware for API routes
 * Validates Supabase session and returns authenticated user information
 *
 * @returns {Promise<{user: Object|null, supabase: Object, error: string|null}>}
 */
export async function withAuth() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        supabase,
        error: 'Authentication required'
      };
    }

    return {
      user: {
        ...user,
        id: user.id,
        email: user.email
      },
      supabase,
      error: null
    };
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return {
      user: null,
      supabase: null,
      error: 'Authentication failed'
    };
  }
}

/**
 * Convenience function to get authenticated user ID
 *
 * @returns {Promise<{userId: string|null, error: string|null}>}
 */
export async function getAuthenticatedUserId() {
  const { user, error } = await withAuth();

  if (error || !user) {
    return { userId: null, error: error || 'Authentication required' };
  }

  return { userId: user.id, error: null };
}

/**
 * Higher-order function to wrap API handlers with authentication
 * Automatically injects authenticated user and Supabase client into handler
 *
 * @param {Function} handler - API route handler function
 * @returns {Function} Wrapped handler with authentication
 */
export function requireAuth(handler) {
  return async (request, context) => {
    const { user, supabase, error } = await withAuth();

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Authentication required' },
        { status: 401 }
      );
    }

    // Add authenticated user and Supabase client to context
    const enhancedContext = {
      ...context,
      user,
      userId: user.id,
      supabase
    };

    return handler(request, enhancedContext);
  };
}

/**
 * Creates a secure API route handler with Supabase authentication
 *
 * @param {Function} handler - API route handler function
 * @returns {Function} Secure wrapped handler
 */
export function createSecureApiRoute(handler) {
  return async (request, context) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Enhanced context with authenticated user
      const secureContext = {
        ...context,
        user: {
          ...user,
          id: user.id,
          email: user.email
        },
        userId: user.id,
        supabase
      };

      return handler(request, secureContext);
    } catch (error) {
      console.error('Secure API route error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

// lib/supabase/index.ts
// Main entry point for Supabase utilities

// Browser client (for Client Components)
export { createClient, supabase } from './client';

// Server client (for Server Components, Route Handlers, Server Actions)
export { createClient as createServerClient, createAdminClient } from './server';

// Middleware utilities
export { updateSession } from './middleware';

// Auth (context, hooks, provider)
export { AuthProvider, useAuth, useAuthContext, useUserId, useUserEmail } from './auth';

// Core patterns
export { BaseQueryService, CacheManager } from './core';

// Storage
export { StorageService } from './storage';

// Services
export { ProfileService } from './services';

// Validation utilities
export * from './utils/validation';

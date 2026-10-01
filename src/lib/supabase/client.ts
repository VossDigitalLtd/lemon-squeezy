// lib/supabase/client.ts
// Browser client for Supabase - use in Client Components
import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client for use in the browser (Client Components)
 * Singleton pattern to avoid creating multiple clients
 */
export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}

// Convenience export for backward compatibility
export const supabase = createClient();

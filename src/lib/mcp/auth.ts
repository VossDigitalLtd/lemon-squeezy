import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isStaffRole } from '@/lib/auth/roles';

/**
 * Sign-in for the ChatGPT connector (/api/mcp).
 *
 * ChatGPT signs Zoe in through Supabase Auth's OAuth server (enabled in the
 * Supabase dashboard; consent at /oauth/consent) and sends the access token
 * it's given with each request. A token is accepted when it's:
 *   - signed by this project and not expired (checked locally, like page loads)
 *   - issued by this project's auth server
 *   - issued to an OAuth app (has client_id), not a website session
 *   - for an editor or admin
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** The OAuth authorization server ChatGPT signs in with */
export const AUTH_SERVER_ISSUER = `${SUPABASE_URL}/auth/v1`;

/** Who's using the connector (AuthInfo.extra) */
export interface McpUser {
  userId: string;
  email: string | null;
}

let verifier: SupabaseClient | null = null;

export async function verifyMcpToken(_req: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token) return undefined;

  verifier ??= createSupabaseClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.getClaims(token);
  const claims = data?.claims as (Record<string, unknown> & { sub?: string; exp?: number }) | undefined;
  if (error || !claims?.sub) return undefined;
  if (claims.iss !== AUTH_SERVER_ISSUER) return undefined;
  if (typeof claims.client_id !== 'string' || !claims.client_id) return undefined;

  const { data: profile } = await createAdminClient().from('profiles').select('role').eq('id', claims.sub).maybeSingle();
  if (!isStaffRole(profile?.role)) return undefined;

  const user: McpUser = { userId: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
  return {
    token,
    clientId: claims.client_id,
    scopes: [],
    expiresAt: claims.exp,
    extra: { ...user },
  };
}

/** The signed-in user, from a tool call's auth info */
export function mcpUser(authInfo: AuthInfo | undefined): McpUser | null {
  const extra = authInfo?.extra as Partial<McpUser> | undefined;
  return extra?.userId ? { userId: extra.userId, email: extra.email ?? null } : null;
}

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * Real 404s for recipe addresses (/<uid>) that don't exist or that the
 * visitor can't see (drafts, archived, Trash).
 *
 * The recipe page can only say "not found" after the loading screen has
 * started streaming, which fixes the status at 200. So the proxy checks
 * first: a list of published recipe uids is kept in memory (refreshed every
 * few minutes), and only an address missing from it costs a lookup, made as
 * the visitor so editors still reach drafts.
 */

/**
 * Top-level pages that aren't recipes. A test checks this against src/app,
 * so a new top-level page fails the tests until it's added here.
 */
export const RESERVED_TOP_LEVEL = new Set([
  'account',
  'admin',
  'api',
  'auth',
  'forgot-password',
  'login',
  'oauth',
  'print',
  'recipes',
  'signup',
  'what-we-having',
]);

const RECIPE_PATH = /^\/([a-z0-9][a-z0-9-]*)$/;
const REFRESH_MS = 5 * 60 * 1000;

/** The recipe uid a path would show, or null when the path isn't a recipe address */
export function recipeUidFromPath(pathname: string): string | null {
  const match = RECIPE_PATH.exec(pathname);
  if (!match || RESERVED_TOP_LEVEL.has(match[1])) return null;
  return match[1];
}

let published: Set<string> | null = null;
let loadedAt = 0;
let anon: SupabaseClient | null = null;

async function publishedUids(): Promise<Set<string> | null> {
  if (published && Date.now() - loadedAt < REFRESH_MS) return published;
  anon ??= createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.from('recipes').select('uid');
  if (error || !data) return published; // keep the last good list (or none) if the lookup fails
  published = new Set(data.map((r) => r.uid as string));
  loadedAt = Date.now();
  return published;
}

/**
 * True when the request is for a recipe address the visitor can't see.
 * Fails open: if the recipes can't be looked up, the page decides as before.
 */
export async function isMissingRecipe(request: NextRequest): Promise<boolean> {
  const uid = recipeUidFromPath(request.nextUrl.pathname);
  if (!uid) return false;

  const list = await publishedUids();
  if (!list) return false;
  if (list.has(uid)) return false;

  // Not in the list: published since it loaded, a draft an editor can see, or missing
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
  });
  const { data, error } = await supabase.from('recipes').select('uid, status').eq('uid', uid).maybeSingle();
  if (error) return false;
  if (data?.status === 'published') list.add(uid);
  return !data;
}

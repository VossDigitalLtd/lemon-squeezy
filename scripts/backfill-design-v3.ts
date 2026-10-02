/**
 * Design v3 backfill (run after supabase/migrations/optional/022_design_v3.sql)
 *
 * Suggests splitting a trailing "(…)" off each title into the new subtitle
 * field, e.g. "Greek Lemon Roast Potatoes (Patates Lemonates tou Fournou)".
 * Some brackets aren't second names, so review the list before applying.
 *
 * published_at needs no backfill: the migration copies it from created_at,
 * which scripts/fix-migration.ts already set from Prismic publish dates.
 *
 * Shows the planned changes and writes nothing unless you pass --apply.
 *
 * Usage:
 *   npx tsx scripts/backfill-design-v3.ts                                  # dry run
 *   npx tsx scripts/backfill-design-v3.ts --apply --skip=uid-one,uid-two  # write
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { splitSubtitle } from '../src/lib/recipes';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const skip = new Set(
  (args.find((a) => a.startsWith('--skip='))?.slice('--skip='.length) ?? '')
    .split(',')
    .filter(Boolean)
);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RecipeRow {
  id: string;
  uid: string;
  title: string;
  subtitle: string;
}

async function loadRecipes(): Promise<RecipeRow[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, uid, title, subtitle')
    .order('title');
  if (error) throw error;
  return data as RecipeRow[];
}

async function backfillSubtitles(recipes: RecipeRow[]) {
  console.log('\n── Subtitles from bracketed titles ──\n');

  let changed = 0;
  for (const recipe of recipes) {
    if (recipe.subtitle) continue;
    const split = splitSubtitle(recipe.title);
    if (!split) continue;
    if (skip.has(recipe.uid)) {
      console.log(`  -  ${recipe.uid}: skipped`);
      continue;
    }

    const [title, subtitle] = split;
    changed++;
    console.log(`  ${apply ? '✓' : '→'}  ${recipe.uid}\n       title:    ${title}\n       subtitle: ${subtitle}`);
    if (apply) {
      const { error } = await supabase.from('recipes').update({ title, subtitle }).eq('id', recipe.id);
      if (error) console.error(`  ✗  ${recipe.uid}: ${error.message}`);
    }
  }
  console.log(`\n  ${changed} recipe(s) ${apply ? 'updated' : 'would change'}. Exclude any with --skip=uid,uid.`);
}

async function main() {
  console.log(apply ? 'Applying changes.' : 'Dry run: nothing will be written. Add --apply to write.');
  const recipes = await loadRecipes();
  await backfillSubtitles(recipes);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

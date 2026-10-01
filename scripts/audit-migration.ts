/**
 * Migration Audit: Compare Prismic recipes vs Supabase
 *
 * Lists ALL recipes in Prismic (including archived) and checks
 * which ones made it to Supabase, highlighting gaps.
 *
 * Usage:
 *   npx tsx scripts/audit-migration.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as prismic from '@prismicio/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PRISMIC_REPO = 'lemon-squeezy';
const PRISMIC_ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!PRISMIC_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars.');
  process.exit(1);
}

const prismicClient = prismic.createClient(PRISMIC_REPO, {
  accessToken: PRISMIC_ACCESS_TOKEN,
});

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Migration Audit: Prismic vs Supabase    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Fetch ALL recipes from Prismic (no filters — includes archived)
  console.log('Fetching ALL recipes from Prismic (including archived)...');
  const allPrismic = await prismicClient.getAllByType('recipe');
  console.log(`Total in Prismic: ${allPrismic.length}\n`);

  // 2. Fetch non-archived recipes from Prismic
  const nonArchived = await prismicClient.getAllByType('recipe', {
    filters: [prismic.filter.not('document.tags', ['archived'])],
  });
  console.log(`Non-archived in Prismic: ${nonArchived.length}`);
  console.log(`Archived in Prismic: ${allPrismic.length - nonArchived.length}\n`);

  // 3. Fetch all recipes from Supabase
  const { data: supabaseRecipes, error } = await supabase
    .from('recipes')
    .select('uid, title, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch from Supabase:', error.message);
    process.exit(1);
  }

  const supabaseUids = new Set((supabaseRecipes || []).map((r) => r.uid));
  console.log(`Total in Supabase: ${supabaseUids.size}\n`);

  // 4. Show archived recipes (excluded from migration)
  const archivedDocs = allPrismic.filter((doc) =>
    doc.tags?.includes('archived')
  );
  if (archivedDocs.length > 0) {
    console.log('── Archived in Prismic (excluded from migration) ──');
    for (const doc of archivedDocs) {
      const title = Array.isArray(doc.data.title)
        ? doc.data.title.map((b: { text?: string }) => b.text || '').join('')
        : String(doc.data.title || doc.uid);
      console.log(`  🗄  ${doc.uid} — "${title}" [tags: ${doc.tags.join(', ')}]`);
    }
    console.log('');
  }

  // 5. Find recipes in Prismic (non-archived) that are NOT in Supabase
  const missingFromSupabase = nonArchived.filter(
    (doc) => !supabaseUids.has(doc.uid!)
  );

  if (missingFromSupabase.length > 0) {
    console.log('── MISSING from Supabase (non-archived, should have been migrated) ──');
    for (const doc of missingFromSupabase) {
      const title = Array.isArray(doc.data.title)
        ? doc.data.title.map((b: { text?: string }) => b.text || '').join('')
        : String(doc.data.title || doc.uid);
      console.log(`  ✗ ${doc.uid} — "${title}" [tags: ${doc.tags?.join(', ') || 'none'}]`);
    }
    console.log('');
  } else {
    console.log('── All non-archived Prismic recipes are present in Supabase ──\n');
  }

  // 6. Show all Prismic recipes with their tags and publication dates
  console.log('── Full Prismic recipe list (by first_publication_date) ──');
  const sorted = [...allPrismic].sort((a, b) => {
    const da = a.first_publication_date || '';
    const db = b.first_publication_date || '';
    return db.localeCompare(da);
  });
  for (const doc of sorted) {
    const title = Array.isArray(doc.data.title)
      ? doc.data.title.map((b: { text?: string }) => b.text || '').join('')
      : String(doc.data.title || doc.uid);
    const inSupabase = supabaseUids.has(doc.uid!) ? '✓' : '✗';
    const archived = doc.tags?.includes('archived') ? ' [ARCHIVED]' : '';
    const pubDate = doc.first_publication_date?.slice(0, 10) || 'no pub date';
    console.log(`  ${inSupabase} ${pubDate}  ${doc.uid} — "${title}"${archived}`);
  }

  // 7. Show Supabase ordering check
  console.log('\n── Supabase recipe ordering (by created_at) ──');
  for (const r of supabaseRecipes || []) {
    const date = r.created_at?.slice(0, 10) || 'no date';
    console.log(`  ${date}  ${r.uid} — "${r.title}"`);
  }

  console.log('\n══════════════════════════════════════════');
  console.log('Audit complete.');
  console.log('══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});

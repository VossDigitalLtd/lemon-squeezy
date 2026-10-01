/**
 * Fix Migration: Insert missing recipes + backfill publication dates
 *
 * 1. Finds recipes in Prismic that are missing from Supabase and inserts them
 * 2. Updates every recipe's created_at to match Prismic's first_publication_date
 *    so that ordering reflects the original publication order
 *
 * Usage:
 *   npx tsx scripts/fix-migration.ts
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

// ─── Ingredient Parsing (same as migrate-prismic.ts) ────────────────────────

const UNIT_ALIASES: Record<string, string> = {
  tablespoons: 'tbsp', tablespoon: 'tbsp', tbsp: 'tbsp', tbs: 'tbsp',
  teaspoons: 'tsp', teaspoon: 'tsp', tsp: 'tsp',
  cups: 'cup', cup: 'cup',
  pints: 'pint', pint: 'pint', pt: 'pint',
  litres: 'l', litre: 'l', liters: 'l', liter: 'l', l: 'l',
  millilitres: 'ml', millilitre: 'ml', milliliters: 'ml', milliliter: 'ml', ml: 'ml',
  'fl oz': 'floz', 'fluid ounces': 'floz', 'fluid ounce': 'floz', floz: 'floz',
  kilograms: 'kg', kilogram: 'kg', kg: 'kg',
  grams: 'g', gram: 'g', g: 'g',
  pounds: 'lb', pound: 'lb', lbs: 'lb', lb: 'lb',
  ounces: 'oz', ounce: 'oz', oz: 'oz',
  pieces: 'piece', piece: 'piece',
  slices: 'slice', slice: 'slice',
  bunches: 'bunch', bunch: 'bunch',
  cloves: 'clove', clove: 'clove',
  pinches: 'pinch', pinch: 'pinch',
  handfuls: 'handful', handful: 'handful',
  cans: 'can', can: 'can',
  tins: 'tin', tin: 'tin',
  heads: 'head', head: 'head',
  sprigs: 'sprig', sprig: 'sprig',
  sticks: 'stick', stick: 'stick',
  cm: 'cm', inches: 'inch', inch: 'inch',
};

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '¼': 0.25, '¾': 0.75, '⅔': 2 / 3,
};

function parseFraction(s: string): number | null {
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(char)) {
      const rest = s.replace(char, '').trim();
      return rest ? parseInt(rest) + val : val;
    }
  }
  if (s.includes('/')) {
    const [num, den] = s.split('/');
    const n = parseFloat(num);
    const d = parseFloat(den);
    return d ? n / d : null;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Ingredient {
  quantity: number | null;
  unit: string | null;
  name: string;
}

function parseIngredient(raw: string): Ingredient {
  let s = raw.trim();
  if (!s) return { quantity: null, unit: null, name: '' };

  let quantity: number | null = null;
  const qtyMatch = s.match(
    /^(\d+\s*[½⅓¼¾⅔]|[½⅓¼¾⅔]|\d+\/\d+|\d+\.?\d*)\s*/
  );
  if (qtyMatch) {
    quantity = parseFraction(qtyMatch[1].trim());
    s = s.slice(qtyMatch[0].length).trim();
  }

  let unit: string | null = null;
  const sortedAliases = Object.keys(UNIT_ALIASES).sort(
    (a, b) => b.length - a.length
  );
  for (const alias of sortedAliases) {
    const re = new RegExp(`^${escapeRegex(alias)}(?:\\b|\\s|$)`, 'i');
    if (re.test(s)) {
      unit = UNIT_ALIASES[alias];
      s = s.slice(alias.length).trim();
      s = s.replace(/^of\s+/i, '');
      break;
    }
  }

  return { quantity, unit, name: s };
}

function richTextToPlain(field: unknown): string {
  if (!field || !Array.isArray(field)) return '';
  return field
    .map((block: { text?: string }) => block.text || '')
    .filter(Boolean)
    .join('\n');
}

function getImageAlt(imageField: unknown): string | null {
  if (!imageField || typeof imageField !== 'object') return null;
  const img = imageField as Record<string, unknown>;
  if (typeof img.alt === 'string' && img.alt) return img.alt;
  return null;
}

interface IngredientGroup {
  group_title: string;
  items: Ingredient[];
}

interface MethodGroup {
  group_title: string;
  items: string[];
}

function parseIngredientSlices(body: unknown): IngredientGroup[] {
  if (!Array.isArray(body)) return [];
  return body
    .filter((slice: { slice_type?: string }) => slice.slice_type === 'ingredient_group')
    .map((slice: { primary?: Record<string, unknown>; items?: Record<string, unknown>[] }) => ({
      group_title: typeof slice.primary?.group_title === 'string'
        ? slice.primary.group_title
        : '',
      items: (slice.items || []).map((item) => {
        const raw = typeof item.ingredient === 'string' ? item.ingredient : '';
        return parseIngredient(raw);
      }),
    }))
    .filter((g) => g.items.length > 0);
}

function parseMethodSlices(body1: unknown): MethodGroup[] {
  if (!Array.isArray(body1)) return [];
  return body1
    .filter((slice: { slice_type?: string }) => slice.slice_type === 'method_group')
    .map((slice: { primary?: Record<string, unknown>; items?: Record<string, unknown>[] }) => ({
      group_title: typeof slice.primary?.group_title === 'string'
        ? slice.primary.group_title
        : '',
      items: (slice.items || []).map((item) => {
        if (typeof item.step === 'string') return item.step;
        if (Array.isArray(item.step)) return richTextToPlain(item.step);
        return '';
      }).filter(Boolean),
    }))
    .filter((g) => g.items.length > 0);
}

// ─── Main ───────────────────────────────────────────────────────────────────

type PrismicDoc = prismic.PrismicDocument<Record<string, unknown>>;

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Fix Migration: Missing + Pub Dates      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Fetch all non-archived recipes from Prismic
  const prismicRecipes: PrismicDoc[] = await prismicClient.getAllByType('recipe', {
    filters: [prismic.filter.not('document.tags', ['archived'])],
  });
  console.log(`Prismic recipes: ${prismicRecipes.length}`);

  // Fetch existing Supabase recipes
  const { data: supabaseRecipes, error: fetchError } = await supabase
    .from('recipes')
    .select('id, uid');

  if (fetchError) {
    console.error('Failed to fetch Supabase recipes:', fetchError.message);
    process.exit(1);
  }

  const supabaseByUid = new Map(
    (supabaseRecipes || []).map((r) => [r.uid, r.id])
  );
  console.log(`Supabase recipes: ${supabaseByUid.size}\n`);

  // ── Part 1: Insert missing recipes ──────────────────────────────────────

  const missing = prismicRecipes.filter((doc) => !supabaseByUid.has(doc.uid!));

  if (missing.length > 0) {
    console.log(`── Inserting ${missing.length} missing recipe(s) ──\n`);

    // We need categories map for junction rows
    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, uid, type');
    const categoryByUid = new Map(
      (allCategories || []).map((c) => [`${c.type}:${c.uid}`, c.id])
    );

    for (const doc of missing) {
      const data = doc.data;
      const title = richTextToPlain(data.title);
      const uid = doc.uid || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const ingredientGroups = parseIngredientSlices(data.body);
      const methodGroups = parseMethodSlices(data.body1);

      const recipeRow = {
        uid,
        title,
        short_description: richTextToPlain(data.short_description),
        full_description: richTextToPlain(data.full_description),
        feature_image_path: null as string | null,
        feature_image_alt: getImageAlt(data.feature_image),
        prep_time: typeof data.prep_time === 'number' ? data.prep_time : null,
        cook_time: typeof data.cook_time === 'number' ? data.cook_time : null,
        servings: typeof data.servings === 'number' ? data.servings : null,
        calories_per_serving: null,
        ingredient_groups: ingredientGroups,
        method_groups: methodGroups,
        serving_suggestions: richTextToPlain(data.serving_suggestions),
        tips: richTextToPlain(data.tips),
      };

      const { data: inserted, error } = await supabase
        .from('recipes')
        .insert(recipeRow)
        .select('id')
        .single();

      if (error) {
        console.error(`  ✗ Failed to insert "${title}": ${error.message}`);
        continue;
      }

      supabaseByUid.set(uid, inserted.id);
      console.log(`  ✓ Inserted: ${title} (${inserted.id})`);

      // Insert category junction rows
      for (const categoryType of ['course', 'cuisine', 'dietary'] as const) {
        const groupKey = `${categoryType}_categories`;
        const categoryGroup = data[groupKey];
        if (!Array.isArray(categoryGroup)) continue;

        for (const item of categoryGroup) {
          const link = (item as Record<string, unknown>)[categoryType] as { uid?: string } | undefined;
          if (!link?.uid) continue;

          const categoryId = categoryByUid.get(`${categoryType}:${link.uid}`);
          if (!categoryId) continue;

          await supabase
            .from('recipe_categories')
            .insert({ recipe_id: inserted.id, category_id: categoryId });
        }
      }
    }
    console.log('');
  } else {
    console.log('No missing recipes.\n');
  }

  // ── Part 2: Backfill created_at from Prismic publication dates ──────────

  console.log('── Updating created_at from Prismic publication dates ──\n');

  let updated = 0;
  let skipped = 0;

  for (const doc of prismicRecipes) {
    const uid = doc.uid!;
    const pubDate = doc.first_publication_date;

    if (!pubDate) {
      console.log(`  ⚠ No publication date for "${uid}" — skipping`);
      skipped++;
      continue;
    }

    const recipeId = supabaseByUid.get(uid);
    if (!recipeId) {
      console.log(`  ⚠ "${uid}" not in Supabase — skipping`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('recipes')
      .update({ created_at: pubDate })
      .eq('id', recipeId);

    if (error) {
      console.error(`  ✗ Failed to update "${uid}": ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${uid} → ${pubDate.slice(0, 10)}`);
    updated++;
  }

  console.log(`\n══════════════════════════════════════════`);
  console.log(`✓ Done! ${missing.length} inserted, ${updated} dates updated, ${skipped} skipped`);
  console.log('══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});

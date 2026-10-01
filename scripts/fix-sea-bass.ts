/**
 * Fix: Insert the missing "Harissa Pan-Fried Sea Bass" recipe
 *
 * The original migration failed because a numeric field (likely servings
 * or a time field) has a decimal value like "6.5" which doesn't fit
 * an INTEGER column. This script rounds those values before inserting.
 *
 * Usage:
 *   npx tsx scripts/fix-sea-bass.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as prismic from '@prismicio/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PRISMIC_REPO = 'lemon-squeezy';
const PRISMIC_ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const prismicClient = prismic.createClient(PRISMIC_REPO, {
  accessToken: PRISMIC_ACCESS_TOKEN,
});

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Parsing helpers (same as migration) ────────────────────────────────────

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

interface Ingredient { quantity: number | null; unit: string | null; name: string; }

function parseIngredient(raw: string): Ingredient {
  let s = raw.trim();
  if (!s) return { quantity: null, unit: null, name: '' };
  let quantity: number | null = null;
  const qtyMatch = s.match(/^(\d+\s*[½⅓¼¾⅔]|[½⅓¼¾⅔]|\d+\/\d+|\d+\.?\d*)\s*/);
  if (qtyMatch) { quantity = parseFraction(qtyMatch[1].trim()); s = s.slice(qtyMatch[0].length).trim(); }
  let unit: string | null = null;
  const sortedAliases = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    const re = new RegExp(`^${escapeRegex(alias)}(?:\\b|\\s|$)`, 'i');
    if (re.test(s)) { unit = UNIT_ALIASES[alias]; s = s.slice(alias.length).trim(); s = s.replace(/^of\s+/i, ''); break; }
  }
  return { quantity, unit, name: s };
}

function richTextToPlain(field: unknown): string {
  if (!field || !Array.isArray(field)) return '';
  return field.map((block: { text?: string }) => block.text || '').filter(Boolean).join('\n');
}

function getImageAlt(imageField: unknown): string | null {
  if (!imageField || typeof imageField !== 'object') return null;
  const img = imageField as Record<string, unknown>;
  if (typeof img.alt === 'string' && img.alt) return img.alt;
  return null;
}

function parseIngredientSlices(body: unknown) {
  if (!Array.isArray(body)) return [];
  return body
    .filter((slice: { slice_type?: string }) => slice.slice_type === 'ingredient_group')
    .map((slice: { primary?: Record<string, unknown>; items?: Record<string, unknown>[] }) => ({
      group_title: typeof slice.primary?.group_title === 'string' ? slice.primary.group_title : '',
      items: (slice.items || []).map((item) => parseIngredient(typeof item.ingredient === 'string' ? item.ingredient : '')),
    }))
    .filter((g) => g.items.length > 0);
}

function parseMethodSlices(body1: unknown) {
  if (!Array.isArray(body1)) return [];
  return body1
    .filter((slice: { slice_type?: string }) => slice.slice_type === 'method_group')
    .map((slice: { primary?: Record<string, unknown>; items?: Record<string, unknown>[] }) => ({
      group_title: typeof slice.primary?.group_title === 'string' ? slice.primary.group_title : '',
      items: (slice.items || []).map((item) => {
        if (typeof item.step === 'string') return item.step;
        if (Array.isArray(item.step)) return richTextToPlain(item.step);
        return '';
      }).filter(Boolean),
    }))
    .filter((g) => g.items.length > 0);
}

function safeInt(val: unknown): number | null {
  if (typeof val === 'number') return Math.round(val);
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? null : Math.round(n);
  }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching harissa-pan-fried-sea-bass from Prismic...\n');

  const docs = await prismicClient.getAllByType('recipe', {
    filters: [prismic.filter.at('my.recipe.uid', 'harissa-pan-fried-sea-bass')],
  });

  if (docs.length === 0) {
    console.error('Recipe not found in Prismic!');
    process.exit(1);
  }

  const doc = docs[0];
  const data = doc.data;
  const title = richTextToPlain(data.title);
  const uid = doc.uid!;

  // Log the raw numeric fields to see the offending value
  console.log('Raw numeric fields:');
  console.log(`  prep_time: ${data.prep_time} (${typeof data.prep_time})`);
  console.log(`  cook_time: ${data.cook_time} (${typeof data.cook_time})`);
  console.log(`  servings:  ${data.servings} (${typeof data.servings})\n`);

  const recipeRow = {
    uid,
    title,
    short_description: richTextToPlain(data.short_description),
    full_description: richTextToPlain(data.full_description),
    feature_image_path: null as string | null,
    feature_image_alt: getImageAlt(data.feature_image),
    prep_time: safeInt(data.prep_time),
    cook_time: safeInt(data.cook_time),
    servings: safeInt(data.servings),
    calories_per_serving: null,
    ingredient_groups: parseIngredientSlices(data.body),
    method_groups: parseMethodSlices(data.body1),
    serving_suggestions: richTextToPlain(data.serving_suggestions),
    tips: richTextToPlain(data.tips),
    created_at: doc.first_publication_date,
  };

  console.log(`Inserting with: prep_time=${recipeRow.prep_time}, cook_time=${recipeRow.cook_time}, servings=${recipeRow.servings}\n`);

  const { data: inserted, error } = await supabase
    .from('recipes')
    .insert(recipeRow)
    .select('id')
    .single();

  if (error) {
    console.error(`✗ Failed: ${error.message}`);
    process.exit(1);
  }

  console.log(`✓ Inserted "${title}" (${inserted.id})`);

  // Insert category junctions
  const { data: allCategories } = await supabase.from('categories').select('id, uid, type');
  const categoryByUid = new Map((allCategories || []).map((c) => [`${c.type}:${c.uid}`, c.id]));

  for (const categoryType of ['course', 'cuisine', 'dietary'] as const) {
    const groupKey = `${categoryType}_categories`;
    const categoryGroup = data[groupKey];
    if (!Array.isArray(categoryGroup)) continue;

    for (const item of categoryGroup) {
      const link = (item as Record<string, unknown>)[categoryType] as { uid?: string } | undefined;
      if (!link?.uid) continue;
      const categoryId = categoryByUid.get(`${categoryType}:${link.uid}`);
      if (!categoryId) continue;
      await supabase.from('recipe_categories').insert({ recipe_id: inserted.id, category_id: categoryId });
    }
  }

  console.log('✓ Category links inserted');
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});

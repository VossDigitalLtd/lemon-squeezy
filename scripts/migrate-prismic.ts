/**
 * Prismic → Supabase Migration Script
 *
 * Reads all recipes and categories from Prismic and inserts them into
 * Supabase, auto-parsing ingredient strings into structured data.
 *
 * Usage:
 *   npx tsx scripts/migrate-prismic.ts
 *
 * Requires:
 *   - PRISMIC_ACCESS_TOKEN (from old .env.local)
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as prismic from '@prismicio/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ─── Configuration ───────────────────────────────────────────────────────────

const PRISMIC_REPO = 'lemon-squeezy';
const PRISMIC_ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!PRISMIC_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Ensure PRISMIC_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const prismicClient = prismic.createClient(PRISMIC_REPO, {
  accessToken: PRISMIC_ACCESS_TOKEN,
});

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Ingredient Parsing (simplified version of src/lib/units.ts) ─────────────

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
  // Unicode fractions
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(char)) {
      const rest = s.replace(char, '').trim();
      return rest ? parseInt(rest) + val : val;
    }
  }
  // "1/2" style
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

  // 1. Extract leading quantity
  let quantity: number | null = null;
  const qtyMatch = s.match(
    /^(\d+\s*[½⅓¼¾⅔]|[½⅓¼¾⅔]|\d+\/\d+|\d+\.?\d*)\s*/
  );
  if (qtyMatch) {
    quantity = parseFraction(qtyMatch[1].trim());
    s = s.slice(qtyMatch[0].length).trim();
  }

  // 2. Try to match a unit at the start
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

// ─── Prismic Rich Text Helpers ───────────────────────────────────────────────

function richTextToPlain(field: unknown): string {
  if (!field || !Array.isArray(field)) return '';
  return field
    .map((block: { text?: string }) => block.text || '')
    .filter(Boolean)
    .join('\n');
}

// ─── Migration ───────────────────────────────────────────────────────────────

type PrismicDoc = prismic.PrismicDocument<Record<string, unknown>>;

// Map Prismic document IDs → Supabase UUIDs
const prismicToSupabaseId = new Map<string, string>();

async function migrateCategories() {
  console.log('\n── Migrating Categories ──\n');

  const types: { prismicType: string; categoryType: string }[] = [
    { prismicType: 'course', categoryType: 'course' },
    { prismicType: 'cuisine', categoryType: 'cuisine' },
    { prismicType: 'dietary', categoryType: 'dietary' },
  ];

  for (const { prismicType, categoryType } of types) {
    console.log(`  Fetching ${prismicType}...`);
    const docs: PrismicDoc[] = await prismicClient.getAllByType(prismicType, {
      filters: [prismic.filter.not('document.tags', ['archived'])],
    });

    console.log(`  Found ${docs.length} ${prismicType} documents`);

    for (const doc of docs) {
      const title = richTextToPlain(doc.data.title);
      const uid = doc.uid || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          type: categoryType,
          uid,
          title,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  ✗ Failed to insert ${categoryType}/${uid}: ${error.message}`);
        continue;
      }

      prismicToSupabaseId.set(doc.id, data.id);
      console.log(`  ✓ ${categoryType}: ${title} (${doc.id} → ${data.id})`);
    }
  }
}

async function migrateRecipes() {
  console.log('\n── Migrating Recipes ──\n');

  console.log('  Fetching recipes from Prismic...');
  const recipes: PrismicDoc[] = await prismicClient.getAllByType('recipe', {
    filters: [prismic.filter.not('document.tags', ['archived'])],
  });

  console.log(`  Found ${recipes.length} recipes\n`);

  // First pass: insert all recipes (without accompanying links)
  for (const doc of recipes) {
    const data = doc.data;
    const title = richTextToPlain(data.title);
    const uid = doc.uid || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Parse ingredient groups from body slice zone
    const ingredientGroups = parseIngredientSlices(data.body);

    // Parse method groups from body1 slice zone
    const methodGroups = parseMethodSlices(data.body1);

    const recipeRow = {
      uid,
      title,
      short_description: richTextToPlain(data.short_description),
      full_description: richTextToPlain(data.full_description),
      feature_image_path: null as string | null, // Images stay in Prismic CDN for now
      feature_image_alt: getImageAlt(data.feature_image),
      prep_time: typeof data.prep_time === 'number' ? Math.round(data.prep_time) : null,
      cook_time: typeof data.cook_time === 'number' ? Math.round(data.cook_time) : null,
      servings: typeof data.servings === 'number' ? Math.round(data.servings) : null,
      calories_per_serving: null, // New field — not in Prismic
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
      console.error(`  ✗ Failed to insert recipe "${title}": ${error.message}`);
      continue;
    }

    prismicToSupabaseId.set(doc.id, inserted.id);
    console.log(`  ✓ Recipe: ${title}`);

    // Log parsed ingredients for review
    for (const group of ingredientGroups) {
      const label = group.group_title ? `[${group.group_title}]` : '[default]';
      for (const item of group.items) {
        const parts = [
          item.quantity != null ? String(item.quantity) : '_',
          item.unit || '_',
          item.name,
        ].join(' | ');
        console.log(`      ${label} ${parts}`);
      }
    }

    // Insert category junction rows
    await insertCategoryLinks(inserted.id, data.course_categories, 'course');
    await insertCategoryLinks(inserted.id, data.cuisine_categories, 'cuisine');
    await insertCategoryLinks(inserted.id, data.dietary_categories, 'dietary');
  }

  // Second pass: insert accompanying recipe links
  console.log('\n  Linking accompanying recipes...');
  for (const doc of recipes) {
    const recipeId = prismicToSupabaseId.get(doc.id);
    if (!recipeId) continue;

    const accompanyingGroup = doc.data.accompanying_recipes;
    if (!Array.isArray(accompanyingGroup)) continue;

    for (const item of accompanyingGroup) {
      const link = (item as Record<string, unknown>).recipe as { id?: string } | undefined;
      if (!link?.id) continue;

      const accompId = prismicToSupabaseId.get(link.id);
      if (!accompId) {
        console.log(`    ⚠ Skipping unresolved accompanying link: ${link.id}`);
        continue;
      }

      if (accompId === recipeId) continue; // Self-reference guard

      const { error } = await supabase
        .from('recipe_accompanying')
        .insert({ recipe_id: recipeId, accompanying_id: accompId });

      if (error && !error.message.includes('duplicate')) {
        console.error(`    ✗ Failed to link accompanying: ${error.message}`);
      }
    }
  }
}

// ─── Slice Parsers ───────────────────────────────────────────────────────────

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
        const raw = typeof item.ingredient === 'string'
          ? item.ingredient
          : '';
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
        // step can be a rich text array or a string
        if (typeof item.step === 'string') return item.step;
        if (Array.isArray(item.step)) return richTextToPlain(item.step);
        return '';
      }).filter(Boolean),
    }))
    .filter((g) => g.items.length > 0);
}

// ─── Category Junction Helpers ───────────────────────────────────────────────

async function insertCategoryLinks(
  recipeId: string,
  categoryGroup: unknown,
  fieldName: string
) {
  if (!Array.isArray(categoryGroup)) return;

  for (const item of categoryGroup) {
    const link = (item as Record<string, unknown>)[fieldName] as { id?: string } | undefined;
    if (!link?.id) continue;

    const categoryId = prismicToSupabaseId.get(link.id);
    if (!categoryId) {
      console.log(`    ⚠ Skipping unresolved ${fieldName} category link: ${link.id}`);
      continue;
    }

    const { error } = await supabase
      .from('recipe_categories')
      .insert({ recipe_id: recipeId, category_id: categoryId });

    if (error && !error.message.includes('duplicate')) {
      console.error(`    ✗ Failed to link ${fieldName} category: ${error.message}`);
    }
  }
}

// ─── Image Helpers ───────────────────────────────────────────────────────────

function getImageAlt(imageField: unknown): string | null {
  if (!imageField || typeof imageField !== 'object') return null;
  const img = imageField as Record<string, unknown>;
  if (typeof img.alt === 'string' && img.alt) return img.alt;
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Prismic → Supabase Migration           ║');
  console.log('╚══════════════════════════════════════════╝');

  try {
    await migrateCategories();
    await migrateRecipes();

    console.log('\n══════════════════════════════════════════');
    console.log(`✓ Migration complete!`);
    console.log(`  Categories: ${[...prismicToSupabaseId.values()].length} total mappings`);
    console.log('══════════════════════════════════════════\n');

    console.log('NOTE: Recipe images were NOT migrated.');
    console.log('Images can be re-uploaded via the admin UI.');
    console.log('Prismic CDN URLs will continue to work for existing images.\n');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

main();

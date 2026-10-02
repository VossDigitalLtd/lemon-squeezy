/**
 * Build the ingredient library from existing recipes (run after migration 029).
 *
 * Reads every ingredient line, works out what it is ("chicken breast, diced"
 * → Chicken breast + note "diced"), and proposes one library entry per
 * ingredient with a guessed aisle. Lines that look like two ingredients in one
 * ("Salt & pepper 3 chicken breasts cubed") are listed for fixing by hand.
 *
 * Dry run by default: writes scripts/output/ingredient-library-report.md and
 * changes nothing. With --apply it first saves a backup of every recipe's
 * ingredients to scripts/output/, then:
 *   - creates the library entries (and their other names),
 *   - sets ingredient_id, a tidy name and a note on each ingredient line,
 *     and fills in quantities that were stuck in the name ("-8 chicken thighs"),
 *   - fills recipe_ingredients (used for filtering by ingredient).
 * Running it again only adds what's missing.
 *
 * Usage:
 *   npx tsx scripts/build-ingredient-library.ts           # report only
 *   npx tsx scripts/build-ingredient-library.ts --apply   # write
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { AISLE_LABELS, displayName, guessAisle, isStaple, parseIngredientName, slugify, type Aisle } from '../src/lib/ingredientMatch';

const apply = process.argv.includes('--apply');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const OUT = 'scripts/output';

interface Item {
  quantity: number | null;
  unit: string | null;
  name: string;
  note?: string;
  ingredient_id?: string;
}
interface Recipe {
  id: string;
  uid: string;
  title: string;
  ingredient_groups: { group_title: string; items: Item[] }[];
}
interface Proposal {
  core: string;
  name: string;
  aisle: Aisle;
  staple: boolean;
  variants: Map<string, number>;
  recipes: Set<string>;
}

/** Looks like two ingredients run together, or needs a human */
function suspicious(raw: string): string | null {
  if (/\b(and|&)\b.*\d/.test(raw) && /\d/.test(raw.replace(/^[-–]?\s*\d+/, ''))) return 'may be two ingredients in one line';
  if (/\d/.test(raw.replace(/^[-–]?\s*\d+(\.\d+)?(\s*(-|to)\s*\d+)?/, '').replace(/\d+\s*stock cubes?/, ''))) return 'has a number in the middle of the name';
  if (raw.length > 60) return 'long name: check the core ingredient';
  return null;
}

async function main() {
  console.log(apply ? 'Applying changes.' : 'Dry run: nothing will be written. Add --apply to write.');
  mkdirSync(OUT, { recursive: true });

  const { data, error } = await supabase.from('recipes').select('id, uid, title, ingredient_groups').order('title');
  if (error) throw error;
  const recipes = data as Recipe[];

  const proposals = new Map<string, Proposal>();
  const flagged: { recipe: string; raw: string; reason: string }[] = [];

  for (const r of recipes) {
    for (const g of r.ingredient_groups) {
      for (const item of g.items) {
        if (!item.name?.trim()) continue;
        const parsed = parseIngredientName(item.name);
        const reason = suspicious(item.name);
        if (reason || !parsed.core) flagged.push({ recipe: r.title, raw: item.name, reason: reason ?? 'no ingredient found' });
        if (!parsed.core) continue;
        const p = proposals.get(parsed.core) ?? {
          core: parsed.core,
          name: displayName(parsed.core),
          aisle: guessAisle(parsed.core),
          staple: isStaple(parsed.core),
          variants: new Map(),
          recipes: new Set(),
        };
        p.variants.set(item.name.trim(), (p.variants.get(item.name.trim()) ?? 0) + 1);
        p.recipes.add(r.title);
        proposals.set(parsed.core, p);
      }
    }
  }

  // ── Report ──
  const sorted = [...proposals.values()].sort((a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name));
  const lines: string[] = [
    '# Ingredient library: proposed entries',
    '',
    `${proposals.size} ingredients from ${recipes.length} recipes. Check the names and aisles; fix anything odd on the admin Ingredients page after applying (rename, change aisle, merge duplicates).`,
    '',
  ];
  let aisle = '';
  for (const p of sorted) {
    if (p.aisle !== aisle) {
      aisle = p.aisle;
      lines.push('', `## ${AISLE_LABELS[p.aisle]}`, '');
    }
    const variants = [...p.variants.keys()].filter((v) => v.toLowerCase() !== p.core);
    lines.push(
      `- **${p.name}**${p.staple ? ' _(cupboard staple)_' : ''}: ${p.recipes.size} recipe${p.recipes.size === 1 ? '' : 's'}` +
        (variants.length ? `\n  - written as: ${variants.map((v) => `"${v}"`).join(', ')}` : '')
    );
  }
  lines.push('', '## Lines to check by hand', '', ...flagged.map((f) => `- ${f.recipe}: "${f.raw}" (${f.reason})`));
  writeFileSync(`${OUT}/ingredient-library-report.md`, lines.join('\n'));

  console.log(`\n${proposals.size} ingredients proposed from ${recipes.length} recipes.`);
  console.log(`${flagged.length} lines to check by hand.`);
  console.log(`Report: ${OUT}/ingredient-library-report.md`);
  if (!apply) return;

  // ── Backup ──
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(`${OUT}/backup-ingredient-groups-${stamp}.json`, JSON.stringify(recipes.map((r) => ({ id: r.id, uid: r.uid, ingredient_groups: r.ingredient_groups })), null, 2));
  console.log(`Backup: ${OUT}/backup-ingredient-groups-${stamp}.json`);

  // ── Library entries (keeps any that already exist) ──
  const { data: existing } = await supabase.from('ingredients').select('id, name');
  const idByName = new Map((existing ?? []).map((e) => [e.name.toLowerCase(), e.id as string]));
  const { data: aliasRows } = await supabase.from('ingredient_aliases').select('alias, ingredient_id');
  const idByAlias = new Map((aliasRows ?? []).map((a) => [a.alias as string, a.ingredient_id as string]));

  const toCreate = sorted.filter((p) => !idByName.has(p.name.toLowerCase()) && !idByAlias.has(p.core));
  for (let i = 0; i < toCreate.length; i += 100) {
    const batch = toCreate.slice(i, i + 100).map((p) => ({ name: p.name, slug: slugify(p.name), category: p.aisle, is_staple: p.staple }));
    const { data: created, error: e } = await supabase.from('ingredients').insert(batch).select('id, name');
    if (e) throw e;
    for (const c of created ?? []) idByName.set(c.name.toLowerCase(), c.id);
  }
  const idForCore = (core: string) => idByAlias.get(core) ?? idByName.get(displayName(core).toLowerCase());

  // Other names: the core form and every way it was written
  const aliases = new Map<string, string>();
  for (const p of sorted) {
    const id = idForCore(p.core);
    if (!id) continue;
    aliases.set(p.core, id);
    for (const v of p.variants.keys()) aliases.set(v.toLowerCase().slice(0, 200), id);
  }
  const aliasRowsToAdd = [...aliases].filter(([a]) => !idByAlias.has(a)).map(([alias, ingredient_id]) => ({ alias, ingredient_id }));
  for (let i = 0; i < aliasRowsToAdd.length; i += 200) {
    const { error: e } = await supabase.from('ingredient_aliases').upsert(aliasRowsToAdd.slice(i, i + 200), { onConflict: 'alias', ignoreDuplicates: true });
    if (e) throw e;
  }
  console.log(`Library: ${toCreate.length} new entries, ${aliasRowsToAdd.length} other names.`);

  // ── Link each recipe's ingredient lines ──
  let updatedRecipes = 0;
  for (const r of recipes) {
    const used = new Set<string>();
    const groups = r.ingredient_groups.map((g) => ({
      ...g,
      items: g.items.map((item) => {
        if (!item.name?.trim() || item.ingredient_id) {
          if (item.ingredient_id) used.add(item.ingredient_id);
          return item;
        }
        const parsed = parseIngredientName(item.name);
        const id = parsed.core ? idForCore(parsed.core) : undefined;
        if (!id) return item;
        used.add(id);
        const note = [item.note, parsed.note].filter(Boolean).join(', ');
        return {
          ...item,
          ingredient_id: id,
          name: parsed.name || item.name,
          ...(note ? { note } : {}),
          quantity: item.quantity ?? parsed.quantity,
          unit: item.unit ?? parsed.unit ?? null,
        };
      }),
    }));

    const { error: e1 } = await supabase.from('recipes').update({ ingredient_groups: groups }).eq('id', r.id);
    if (e1) throw e1;
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', r.id);
    if (used.size) {
      const { error: e2 } = await supabase.from('recipe_ingredients').insert([...used].map((ingredient_id) => ({ recipe_id: r.id, ingredient_id })));
      if (e2) throw e2;
    }
    updatedRecipes++;
  }
  console.log(`Linked ingredients in ${updatedRecipes} recipes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

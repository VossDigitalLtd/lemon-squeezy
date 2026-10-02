/**
 * One-off tidy of the ingredient library after the first build
 * (scripts/build-ingredient-library.ts --apply).
 *
 *   - merges or renames entries that came from wording rather than the
 *     ingredient ("Pinch chilli flake" → Chilli flake, "Bay leave" → Bay leaf).
 *     A rename to a name that already exists becomes a merge.
 *   - moves entries out of "Other" into their aisle, and marks water as a staple
 *   - rewords recipe lines from their original wording in the build's backup,
 *     with the improved matcher ("pinch chilli flakes, good" → "chilli flakes,
 *     a good pinch"). Only where the line still links to the same ingredient
 *     and hasn't been edited since the build.
 *
 * Dry run by default: prints what it would do. --apply writes.
 * Running it again skips anything already done.
 *
 * Usage:
 *   npx tsx scripts/tidy-ingredient-library.ts           # report only
 *   npx tsx scripts/tidy-ingredient-library.ts --apply   # write
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { parseIngredientName, type Aisle } from '../src/lib/ingredientMatch';
import { IngredientService } from '../src/lib/supabase/services/IngredientService';
import type { IngredientGroup } from '../src/types/recipe';

const apply = process.argv.includes('--apply');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const OUT = 'scripts/output';

/** Entry → what it should be. Merged if the new name already exists, otherwise renamed. */
const TIDY: Record<string, string> = {
  'Smoke paprika': 'Smoked paprika',
  'Sprinkling of smoked paprika': 'Smoked paprika',
  'Pinch chilli flake': 'Chilli flake',
  'Pinch of chilli flake': 'Chilli flake',
  'Splash worcestershire sauce': 'Worcestershire sauce',
  'Salt and pepper to season': 'Salt and pepper',
  'Pinch of salt and pepper to season': 'Salt and pepper',
  'Salt and black pepper': 'Salt and pepper',
  'Salt and ground black pepper': 'Salt and pepper',
  'Maltesers but leave some': 'Maltesers',
  'Handful of flat-leaf parsley': 'Flat leaf parsley',
  'Salt flake': 'Sea salt flake',
  'White and black sesame seed': 'Sesame seed',
  'Frozen boiled pea': 'Frozen pea',
  'Hot water': 'Water',
  'Boiling water': 'Water',
  'Bay leave': 'Bay leaf',
  'Red chilly': 'Red chilli',
  'Dorito': 'Doritos',
  'Streaky': 'Streaky bacon',
  'Vegetable': 'Vegetable stock',
  'Goose': 'Goose fat',
  'Tandoori': 'Tandoori spice paste',
  'Can of coke': 'Coke',
  'Lean lamb': 'Lamb mince',
};

const AISLE: Record<string, Aisle> = {
  'Asparagus': 'fruit-veg',
  'Red chilli': 'fruit-veg',
  'Bay leaf': 'herbs-spices',
  'Cayenne': 'herbs-spices',
  'Pul biber': 'herbs-spices',
  'Bicarbonate of soda': 'cupboard',
  'Bucatini': 'cupboard',
  'Macaroni': 'cupboard',
  'Lasagne sheet': 'cupboard',
  'Gnocchi': 'cupboard',
  'Granulated sweetener': 'cupboard',
  'Vanilla extract': 'cupboard',
  'Sriracha': 'cupboard',
  'Tandoori spice paste': 'cupboard',
  'Vegetable stock': 'cupboard',
  'Goose fat': 'cupboard',
  'Crunchie bar': 'cupboard',
  'Kinder bar': 'cupboard',
  'Maltesers': 'cupboard',
  'Doritos': 'cupboard',
  'Manchego': 'dairy-eggs',
  'Pecorino romano': 'dairy-eggs',
  'Streaky bacon': 'meat-fish',
  'Lamb mince': 'meat-fish',
  'Petit pois': 'frozen',
  'Frozen pea': 'frozen',
  'Shop bought pizza base': 'bakery',
  'Coke': 'drinks',
};
const STAPLES = ['Water'];

/** Lines that hold two ingredients: fix in the recipe, then delete the entry */
const BY_HAND = ['Salt and pepper 3 chicken breast', 'Red and 1 yellow pepper and into strip', 'Olive oil salt and pepper'];

interface Entry {
  id: string;
  name: string;
  category: Aisle;
  is_staple: boolean;
}

async function main() {
  console.log(apply ? 'Applying changes.\n' : 'Dry run: nothing will be written. Add --apply to write.\n');

  const { data: rows, error } = await supabase.from('ingredients').select('id, name, category, is_staple');
  if (error) throw error;
  const byName = new Map((rows as Entry[]).map((e) => [e.name.toLowerCase(), e]));

  // ── Merge and rename ──
  console.log('Merge and rename');
  for (const [from, to] of Object.entries(TIDY)) {
    const source = byName.get(from.toLowerCase());
    if (!source) continue; // already done
    const target = byName.get(to.toLowerCase());
    if (target && target.id !== source.id) {
      console.log(`  merge   ${from} → ${target.name}`);
      if (apply) {
        const res = await IngredientService.merge(supabase, source.id, target.id);
        if (!res.success) throw new Error(`${from}: ${res.error}`);
      }
      byName.delete(from.toLowerCase());
    } else {
      console.log(`  rename  ${from} → ${to}`);
      if (apply) {
        const res = await IngredientService.update(supabase, source.id, { name: to });
        if (!res.success) throw new Error(`${from}: ${res.error}`);
      }
      byName.delete(from.toLowerCase());
      byName.set(to.toLowerCase(), { ...source, name: to });
    }
  }

  // ── Aisles and staples ──
  console.log('\nAisles and staples');
  for (const entry of byName.values()) {
    const patch: { category?: Aisle; is_staple?: boolean } = {};
    const aisle = AISLE[entry.name];
    if (aisle && entry.category !== aisle) patch.category = aisle;
    if (STAPLES.includes(entry.name) && !entry.is_staple) patch.is_staple = true;
    if (!Object.keys(patch).length) continue;
    console.log(`  ${entry.name}: ${[patch.category && `aisle ${entry.category} → ${patch.category}`, patch.is_staple && 'cupboard staple'].filter(Boolean).join(', ')}`);
    if (apply) {
      const { error: e } = await supabase.from('ingredients').update(patch).eq('id', entry.id);
      if (e) throw e;
    }
  }

  // ── Reword lines from their original wording ──
  console.log('\nRecipe lines reworded');
  const backups = readdirSync(OUT).filter((f) => f.startsWith('backup-ingredient-groups-')).sort();
  if (!backups.length) {
    console.log('  No backup found in scripts/output, so lines keep their current wording.');
  } else {
    const backup = new Map(
      (JSON.parse(readFileSync(`${OUT}/${backups[backups.length - 1]}`, 'utf8')) as { id: string; ingredient_groups: IngredientGroup[] }[]).map((r) => [r.id, r.ingredient_groups])
    );
    const { data: aliasRows } = await supabase.from('ingredient_aliases').select('alias, ingredient_id');
    const idByAlias = new Map((aliasRows ?? []).map((a) => [a.alias as string, a.ingredient_id as string]));
    const idFor = (core: string) => byName.get(core)?.id ?? idByAlias.get(core);
    // In a dry run the merges haven't happened, so follow them by hand
    const mergedInto = new Map<string, string>();
    for (const [from, to] of Object.entries(TIDY)) {
      const s = (rows as Entry[]).find((e) => e.name.toLowerCase() === from.toLowerCase());
      const t = byName.get(to.toLowerCase());
      if (s && t) mergedInto.set(s.id, t.id);
    }
    const resolve = (id?: string) => (id ? mergedInto.get(id) ?? id : id);

    const { data: recipes, error: e } = await supabase.from('recipes').select('id, title, ingredient_groups').order('title');
    if (e) throw e;
    const newAliases: { alias: string; ingredient_id: string }[] = [];
    let changedLines = 0;

    for (const r of recipes as { id: string; title: string; ingredient_groups: IngredientGroup[] }[]) {
      const original = backup.get(r.id);
      if (!original) continue;
      let changed = false;
      const groups = r.ingredient_groups.map((g, gi) => ({
        ...g,
        items: g.items.map((item, ii) => {
          const linked = resolve(item.ingredient_id);
          const raw = original[gi]?.items[ii];
          if (!linked || !raw?.name) return item;
          // Only if the line hasn't been edited since the build
          const rawWords = new Set(raw.name.toLowerCase().split(/[^a-z0-9-]+/));
          if (!item.name.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean).every((w) => rawWords.has(w))) return item;

          const parsed = parseIngredientName(raw.name);
          const found = resolve(idFor(parsed.core));
          if (found && found !== linked) return item;
          if (!found) newAliases.push({ alias: parsed.core, ingredient_id: linked });
          const note = [raw.note, parsed.note].filter(Boolean).join(', ');
          if (parsed.name === item.name && (note || undefined) === (item.note || undefined)) return item;
          console.log(`  ${r.title}: "${item.name}${item.note ? `, ${item.note}` : ''}" → "${parsed.name}${note ? `, ${note}` : ''}"`);
          changed = true;
          changedLines++;
          const next = { ...item, ingredient_id: linked, name: parsed.name };
          if (note) next.note = note;
          else delete next.note;
          return next;
        }),
      }));
      if (changed && apply) {
        const { error: e2 } = await supabase.from('recipes').update({ ingredient_groups: groups }).eq('id', r.id);
        if (e2) throw e2;
      }
    }
    if (apply && newAliases.length) {
      await supabase.from('ingredient_aliases').upsert(newAliases, { onConflict: 'alias', ignoreDuplicates: true });
    }
    console.log(`  ${changedLines} lines.`);
  }

  // ── Still to do by hand ──
  const left = BY_HAND.filter((n) => byName.has(n.toLowerCase()));
  if (left.length) {
    console.log('\nTwo ingredients in one line: split these in the recipe, link each half, then delete the entry on Admin → Ingredients');
    for (const name of left) {
      const id = byName.get(name.toLowerCase())!.id;
      const { data: used } = await supabase.from('recipe_ingredients').select('recipe:recipes(title)').eq('ingredient_id', id);
      const titles = (used ?? []).map((u) => (u.recipe as unknown as { title: string } | null)?.title).filter(Boolean);
      console.log(`  ${name}${titles.length ? ` (${titles.join(', ')})` : ''}`);
    }
  }
  if (!apply) console.log(`\nNothing written. Run with --apply to make these changes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

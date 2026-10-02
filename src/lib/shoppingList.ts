import { UNITS, displayIngredient, formatAmount, scaleIngredient, type UnitKey } from '@/lib/units';
import type { Ingredient, IngredientGroup } from '@/types/recipe';

// ─── Shopping list: combining ingredients across recipes ────────────────────

export interface ListRecipe {
  id: string;
  uid: string;
  title: string;
  /** The recipe's own serving count (quantities are written for this) */
  servings: number | null;
  ingredient_groups: IngredientGroup[];
  feature_image_path?: string | null;
}

export interface ListEntry {
  recipe: ListRecipe;
  /** Servings to shop for */
  servings: number;
}

export interface ShoppingLine {
  /** Stable key for ticking off: same ingredient + same kind of measure */
  key: string;
  name: string;
  /** Combined quantity and unit, ready to format (null quantity = "to taste" style) */
  ingredient: Ingredient;
  /** Titles of the recipes this line is for */
  recipes: string[];
}

type Family = 'weight' | 'volume' | 'spoon' | 'length' | `count:${string}` | 'each' | 'none';

/** How an amount can be added up: weights with weights, spoons with spoons, cloves with cloves */
function familyOf(item: Ingredient): Family {
  if (item.quantity == null) return 'none';
  if (!item.unit) return 'each';
  if (item.unit === 'tsp' || item.unit === 'tbsp') return 'spoon';
  const def = UNITS[item.unit];
  if (def.type === 'weight') return 'weight';
  if (def.type === 'volume') return 'volume';
  if (def.type === 'length') return 'length';
  return `count:${item.unit}`;
}

/** Amount in the family's base unit: g, ml, tsp, cm, or the count itself */
function toBase(item: Ingredient, family: Family): number {
  const q = item.quantity ?? 0;
  if (family === 'spoon') return item.unit === 'tbsp' ? q * 3 : q;
  if (family === 'weight' || family === 'volume' || family === 'length') return q * UNITS[item.unit as UnitKey].base;
  return q;
}

function fromBase(amount: number, family: Family, unit: UnitKey | null): Ingredient['unit'] {
  if (family === 'weight') return 'g';
  if (family === 'volume') return 'ml';
  if (family === 'length') return 'cm';
  if (family === 'spoon') return 'tsp';
  return unit;
}

/**
 * Normalise a name for matching: lower case, single spaces, no trailing
 * punctuation, and a simple plural ("onions" matches "onion").
 */
export function ingredientKey(name: string): string {
  const n = name.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.,;:]+$/, '').trim();
  return n.replace(/(?<=[a-z]{3})s\b/g, '');
}

/** Combine ingredients from every recipe on the list into one set of lines */
export function combineIngredients(entries: ListEntry[]): ShoppingLine[] {
  const lines = new Map<string, { name: string; family: Family; unit: UnitKey | null; amount: number; recipes: Set<string> }>();

  for (const { recipe, servings } of entries) {
    const base = recipe.servings || servings || 1;
    for (const group of recipe.ingredient_groups) {
      for (const raw of group.items) {
        if (!raw.name?.trim()) continue;
        const item = scaleIngredient(raw, base, servings);
        const family = familyOf(item);
        const key = `${ingredientKey(item.name)}|${family}`;
        const line = lines.get(key) ?? { name: item.name.trim(), family, unit: item.unit, amount: 0, recipes: new Set<string>() };
        line.amount += toBase(item, family);
        line.recipes.add(recipe.title);
        lines.set(key, line);
      }
    }
  }

  return [...lines.entries()]
    .map(([key, l]) => {
      let ingredient: Ingredient;
      if (l.family === 'none') {
        ingredient = { quantity: null, unit: null, name: l.name };
      } else if (l.family === 'spoon' && l.amount >= 3 && Math.abs(l.amount / 3 - Math.round(l.amount / 3)) < 0.01) {
        ingredient = { quantity: Math.round(l.amount / 3), unit: 'tbsp', name: l.name };
      } else {
        ingredient = { quantity: Math.round(l.amount * 100) / 100, unit: fromBase(l.amount, l.family, l.unit), name: l.name };
      }
      return { key, name: l.name, ingredient, recipes: [...l.recipes].sort() };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

/** "2¼ lb potatoes" in the chosen system, tidied like the recipe page */
export function formatLine(line: ShoppingLine, system: 'metric' | 'imperial'): { amount: string; name: string } {
  const shown = line.ingredient.quantity == null ? line.ingredient : displayIngredient(line.ingredient, 1, 1, system);
  return { amount: formatAmount(shown), name: line.name };
}

/** Plain-text version for copying into a message or notes app */
export function listAsText(
  lines: ShoppingLine[],
  extras: { text: string; checked: boolean }[],
  checked: Set<string>,
  system: 'metric' | 'imperial'
): string {
  const rows = lines
    .filter((l) => !checked.has(l.key))
    .map((l) => {
      const { amount, name } = formatLine(l, system);
      return `- ${amount ? `${amount} ` : ''}${name}`;
    });
  const own = extras.filter((e) => !e.checked).map((e) => `- ${e.text}`);
  return ['Shopping list', ...rows, ...own].join('\n');
}

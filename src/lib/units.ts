// ─── Unit Definitions ────────────────────────────────────────────────────────
// Each unit has a `base` value in its canonical metric form:
//   volume → ml, weight → g, length → cm
// This enables serving scaling and metric ↔ imperial conversion.

export const UNITS = {
  // Volume — Metric
  ml:   { label: 'ml',    plural: 'ml',     system: 'metric',    type: 'volume', base: 1 },
  l:    { label: 'l',     plural: 'l',      system: 'metric',    type: 'volume', base: 1000 },
  // Volume — Imperial
  tsp:  { label: 'tsp',   plural: 'tsp',    system: 'imperial',  type: 'volume', base: 4.929 },
  tbsp: { label: 'tbsp',  plural: 'tbsp',   system: 'imperial',  type: 'volume', base: 14.787 },
  floz: { label: 'fl oz', plural: 'fl oz',  system: 'imperial',  type: 'volume', base: 29.574 },
  cup:  { label: 'cup',   plural: 'cups',   system: 'imperial',  type: 'volume', base: 236.588 },
  pint: { label: 'pint',  plural: 'pints',  system: 'imperial',  type: 'volume', base: 473.176 },
  // Weight — Metric
  g:    { label: 'g',     plural: 'g',      system: 'metric',    type: 'weight', base: 1 },
  kg:   { label: 'kg',    plural: 'kg',     system: 'metric',    type: 'weight', base: 1000 },
  // Weight — Imperial
  oz:   { label: 'oz',    plural: 'oz',     system: 'imperial',  type: 'weight', base: 28.3495 },
  lb:   { label: 'lb',    plural: 'lb',     system: 'imperial',  type: 'weight', base: 453.592 },
  // Count / Other
  piece:   { label: 'piece',   plural: 'pieces',   system: 'universal', type: 'count',  base: 1 },
  slice:   { label: 'slice',   plural: 'slices',   system: 'universal', type: 'count',  base: 1 },
  bunch:   { label: 'bunch',   plural: 'bunches',  system: 'universal', type: 'count',  base: 1 },
  clove:   { label: 'clove',   plural: 'cloves',   system: 'universal', type: 'count',  base: 1 },
  pinch:   { label: 'pinch',   plural: 'pinches',  system: 'universal', type: 'count',  base: 1 },
  handful: { label: 'handful', plural: 'handfuls', system: 'universal', type: 'count',  base: 1 },
  can:     { label: 'can',     plural: 'cans',     system: 'universal', type: 'count',  base: 1 },
  tin:     { label: 'tin',     plural: 'tins',     system: 'universal', type: 'count',  base: 1 },
  head:    { label: 'head',    plural: 'heads',    system: 'universal', type: 'count',  base: 1 },
  sprig:   { label: 'sprig',   plural: 'sprigs',   system: 'universal', type: 'count',  base: 1 },
  stick:   { label: 'stick',   plural: 'sticks',   system: 'universal', type: 'count',  base: 1 },
  // Length
  cm:   { label: 'cm',   plural: 'cm',     system: 'metric',    type: 'length', base: 1 },
  inch: { label: 'inch', plural: 'inches', system: 'imperial',  type: 'length', base: 2.54 },
} as const;

export type UnitKey = keyof typeof UNITS;
export type UnitSystem = 'metric' | 'imperial' | 'universal';
export type UnitType = 'volume' | 'weight' | 'count' | 'length';

/** All unit keys as an array (for dropdowns) */
export const UNIT_KEYS = Object.keys(UNITS) as UnitKey[];

/** Units grouped by type for dropdown rendering */
export const UNITS_BY_TYPE: Record<UnitType, UnitKey[]> = {
  volume: UNIT_KEYS.filter((k) => UNITS[k].type === 'volume'),
  weight: UNIT_KEYS.filter((k) => UNITS[k].type === 'weight'),
  count:  UNIT_KEYS.filter((k) => UNITS[k].type === 'count'),
  length: UNIT_KEYS.filter((k) => UNITS[k].type === 'length'),
};

// ─── Preferred conversions (imperial ↔ metric) ──────────────────────────────

const EQUIVALENTS: Partial<Record<UnitKey, UnitKey>> = {
  // Volume
  tsp: 'ml', tbsp: 'ml', floz: 'ml', cup: 'ml', pint: 'ml',
  ml: 'floz', l: 'pint',
  // Weight
  oz: 'g', lb: 'kg',
  g: 'oz', kg: 'lb',
  // Length
  inch: 'cm', cm: 'inch',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export interface Ingredient {
  quantity: number | null;
  unit: UnitKey | null;
  name: string;
}

/** Scale an ingredient for a different serving size. */
export function scaleIngredient(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number
): Ingredient {
  if (!ingredient.quantity || baseServings <= 0) return ingredient;
  const ratio = targetServings / baseServings;
  return {
    ...ingredient,
    quantity: Math.round(ingredient.quantity * ratio * 100) / 100,
  };
}

/** Convert a quantity from one unit to another (same type only). */
export function convertUnit(
  quantity: number,
  fromUnit: UnitKey,
  toUnit: UnitKey
): number {
  const from = UNITS[fromUnit];
  const to = UNITS[toUnit];
  if (from.type !== to.type) return quantity; // Can't convert across types
  const baseValue = quantity * from.base;
  return Math.round((baseValue / to.base) * 100) / 100;
}

/** Get the preferred unit in the opposite measurement system. */
export function getEquivalentUnit(unit: UnitKey): UnitKey | null {
  return EQUIVALENTS[unit] ?? null;
}

/** Format an ingredient for display: "2 tbsp olive oil" or "Salt to taste" */
export function formatIngredient(ingredient: Ingredient): string {
  const parts: string[] = [];
  if (ingredient.quantity != null) {
    parts.push(formatQuantity(ingredient.quantity));
  }
  if (ingredient.unit) {
    const u = UNITS[ingredient.unit];
    const label =
      ingredient.quantity != null && ingredient.quantity !== 1
        ? u.plural
        : u.label;
    parts.push(label);
  }
  parts.push(ingredient.name);
  return parts.join(' ');
}

/** Format a number nicely: 0.5 → "½", 1.5 → "1½", 0.25 → "¼" */
function formatQuantity(n: number): string {
  const fractions: Record<number, string> = {
    0.25: '¼', 0.33: '⅓', 0.5: '½', 0.67: '⅔', 0.75: '¾',
  };
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 100) / 100;

  if (frac === 0) return String(whole);

  const fracStr = fractions[frac];
  if (fracStr) return whole > 0 ? `${whole}${fracStr}` : fracStr;

  return String(n);
}

// ─── Parsing (for migration) ─────────────────────────────────────────────────

/** Common aliases for unit names seen in ingredient strings */
const UNIT_ALIASES: Record<string, UnitKey> = {
  // Volume
  ml: 'ml', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', liter: 'l', litres: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  'fl oz': 'floz', floz: 'floz', 'fluid ounce': 'floz', 'fluid ounces': 'floz',
  cup: 'cup', cups: 'cup',
  pint: 'pint', pints: 'pint',
  // Weight
  g: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  // Count
  piece: 'piece', pieces: 'piece', pcs: 'piece',
  slice: 'slice', slices: 'slice',
  bunch: 'bunch', bunches: 'bunch',
  clove: 'clove', cloves: 'clove',
  pinch: 'pinch',
  handful: 'handful', handfuls: 'handful',
  can: 'can', cans: 'can',
  tin: 'tin', tins: 'tin',
  head: 'head', heads: 'head',
  sprig: 'sprig', sprigs: 'sprig',
  stick: 'stick', sticks: 'stick',
  // Length
  cm: 'cm', centimetre: 'cm', centimeter: 'cm',
  inch: 'inch', inches: 'inch', '"': 'inch',
};

/**
 * Parse a plain-text ingredient string into structured data.
 * e.g. "2 tbsp olive oil" → { quantity: 2, unit: "tbsp", name: "olive oil" }
 *      "Salt to taste"    → { quantity: null, unit: null, name: "Salt to taste" }
 *      "3 eggs"           → { quantity: 3, unit: null, name: "eggs" }
 */
export function parseIngredient(raw: string): Ingredient {
  let s = raw.trim();
  if (!s) return { quantity: null, unit: null, name: '' };

  // 1. Extract leading quantity (number, fraction, mixed)
  let quantity: number | null = null;
  const qtyMatch = s.match(
    /^(\d+\s*[½⅓¼¾⅔]|[½⅓¼¾⅔]|\d+\/\d+|\d+\.?\d*)\s*/
  );
  if (qtyMatch) {
    quantity = parseFraction(qtyMatch[1].trim());
    s = s.slice(qtyMatch[0].length).trim();
  }

  // 2. Try to match a unit at the start
  let unit: UnitKey | null = null;
  const sortedAliases = Object.keys(UNIT_ALIASES).sort(
    (a, b) => b.length - a.length
  );
  for (const alias of sortedAliases) {
    const re = new RegExp(`^${escapeRegex(alias)}(?:\\b|\\s|$)`, 'i');
    if (re.test(s)) {
      unit = UNIT_ALIASES[alias];
      s = s.slice(alias.length).trim();
      // Remove "of" after unit: "2 cups of flour" → "flour"
      s = s.replace(/^of\s+/i, '');
      break;
    }
  }

  return { quantity, unit, name: s };
}

function parseFraction(s: string): number {
  const unicodeFracs: Record<string, number> = {
    '½': 0.5, '⅓': 0.33, '¼': 0.25, '¾': 0.75, '⅔': 0.67,
  };
  // Mixed: "1½" or "1 ½"
  for (const [char, val] of Object.entries(unicodeFracs)) {
    if (s.includes(char)) {
      const whole = parseInt(s.replace(char, '').trim()) || 0;
      return whole + val;
    }
  }
  // Fraction: "1/2"
  if (s.includes('/')) {
    const [num, den] = s.split('/').map(Number);
    return den ? num / den : num;
  }
  return parseFloat(s) || 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

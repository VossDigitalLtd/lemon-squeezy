/**
 * Amounts written into method steps ("Add 500ml of chicken stock").
 *
 * Steps stay plain text. When a step is shown, numbers followed by a weight
 * or volume unit are scaled to the chosen servings and converted to the
 * chosen system, the same way as the ingredient list, so "500ml of stock"
 * keeps pace with "1 stock cube" → "2 stock cubes".
 *
 * Left as written: temperatures, times, sizes ("20cm tin"), counts, amounts
 * in words ("a tablespoon"), and sizes per item ("40g per meatball").
 */

import {
  UNITS,
  UNIT_ALIASES,
  convertUnit,
  displayIngredient,
  formatQuantity,
  tidyQuantity,
  type UnitKey,
} from '@/lib/units';

/** Spelled-out unit names, used when the step spells its unit out */
const LONG_NAMES: Partial<Record<UnitKey, [string, string]>> = {
  ml: ['millilitre', 'millilitres'],
  l: ['litre', 'litres'],
  tsp: ['teaspoon', 'teaspoons'],
  tbsp: ['tablespoon', 'tablespoons'],
  floz: ['fluid ounce', 'fluid ounces'],
  g: ['gram', 'grams'],
  kg: ['kilogram', 'kilograms'],
  oz: ['ounce', 'ounces'],
  lb: ['pound', 'pounds'],
};

// Only weights and volumes scale; counts ("cut into 4 pieces") and lengths don't
const ALIASES = Object.fromEntries(
  Object.entries(UNIT_ALIASES).filter(([, unit]) => UNITS[unit].type === 'volume' || UNITS[unit].type === 'weight')
) as Record<string, UnitKey>;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NUM = String.raw`\d+\s+\d+\/\d+|\d+\s*[½¼¾⅓⅔]|[½¼¾⅓⅔]|\d+\/\d+|\d+(?:\.\d+)?`;
const UNIT_RE = Object.keys(ALIASES)
  .sort((a, b) => b.length - a.length)
  .map(escape)
  .join('|');
// 1: amount, 2: range separator, 3: range end, 4: space before the unit, 5: unit
const AMOUNT_RE = new RegExp(
  String.raw`(?<![\w.\/])(${NUM})(?:(\s*[-–]\s*|\s+to\s+)(${NUM}))?(\s?)(${UNIT_RE})(?![a-zA-Z])`,
  'gi'
);
/** "40g per meatball", "15g each": a size per item, not an amount to scale */
const PER_ITEM_RE = /^\s+(?:per|each)\b/i;

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 };

/** "1 1/2", "1½", "½", "1/2", "1.2" → number */
function parseNumber(text: string): number {
  const t = text.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d*)\s*([½¼¾⅓⅔])$/);
  if (frac) return (Number(frac[1]) || 0) + FRACTIONS[frac[2]];
  const slash = t.match(/^(\d+)\/(\d+)$/);
  if (slash) return Number(slash[1]) / Number(slash[2]);
  return Number(t);
}

export interface StepAmount {
  /** As written: "500ml", "1-2 tablespoons" */
  text: string;
  /** Left as written because it's a size per item ("40g per meatball") */
  perItem: boolean;
}

/** The amounts in a step that scale with servings (for the editor's check panel) */
export function findStepAmounts(step: string): StepAmount[] {
  return [...step.matchAll(AMOUNT_RE)].map((m) => ({
    text: m[0],
    perItem: PER_ITEM_RE.test(step.slice(m.index! + m[0].length)),
  }));
}

/**
 * A step with its amounts scaled from baseServings to servings and shown in
 * the chosen system. At the recipe's own servings in metric (how recipes
 * are written) the step comes back exactly as written.
 */
export function scaleStepAmounts(
  step: string,
  baseServings: number,
  servings: number,
  system: 'metric' | 'imperial'
): string {
  if (servings === baseServings && system === 'metric') return step;

  return step.replace(AMOUNT_RE, (whole, low: string, sep: string | undefined, high: string | undefined, space: string, unitText: string, offset: number) => {
    if (PER_ITEM_RE.test(step.slice(offset + whole.length))) return whole;
    const unit = ALIASES[unitText.toLowerCase()];
    const lowQty = parseNumber(low);
    const highQty = high ? parseNumber(high) : null;
    if (!unit || !Number.isFinite(lowQty) || (highQty !== null && !Number.isFinite(highQty))) return whole;

    // The larger amount picks the unit (500 → 1 l); a range's other end follows it
    const top = displayIngredient({ quantity: highQty ?? lowQty, unit, name: '' }, baseServings, servings, system);
    if (top.quantity == null || !top.unit) return whole;
    const shownUnit = top.unit;
    let amount = formatQuantity(top.quantity);
    if (highQty !== null) {
      const scaledLow = convertUnit((lowQty * servings) / baseServings, unit, shownUnit);
      amount = `${formatQuantity(tidyQuantity(scaledLow, shownUnit))}${sep}${amount}`;
    }

    // "¼ cup", "1 tablespoon", but "1½ cups" and "1-2 tablespoons"
    const plural = highQty !== null || top.quantity > 1;
    const long = LONG_NAMES[shownUnit] && Object.values(LONG_NAMES).some((names) => names!.includes(unitText.toLowerCase()));
    const word = long ? LONG_NAMES[shownUnit]![plural ? 1 : 0] : plural ? UNITS[shownUnit].plural : UNITS[shownUnit].label;
    // Keep "500ml" tight; a changed unit gets a space ("1 l", "18 fl oz")
    const gap = shownUnit === unit ? space : ' ';
    return `${amount}${gap}${word}`;
  });
}

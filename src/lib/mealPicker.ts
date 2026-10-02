import type { RecipeSummary } from '@/types/recipe';

// ─── "What We Having?" picking ──────────────────────────────────────────────
// Pure functions (random source injected) so the rules can be tested.

export type SlotKind = 'starter' | 'main' | 'side' | 'dessert';

/** Which course categories (by uid) can fill each part of a meal */
export const SLOT_COURSES: Record<SlotKind, string[]> = {
  starter: ['starter', 'soup', 'meze', 'dip', 'tapas'],
  main: ['main', 'pasta'],
  side: ['side'],
  dessert: ['dessert'],
};

export const SLOT_LABELS: Record<SlotKind, string> = {
  starter: 'Starter',
  main: 'Main',
  side: 'Side',
  dessert: 'Dessert',
};

export interface MealSlot {
  /** Stable id within a meal: "main", "side-1", "side-2" … */
  id: string;
  kind: SlotKind;
}

export interface MealShape {
  starter: boolean;
  main: boolean;
  sides: number; // 0–2
  dessert: boolean;
}

export interface PickFilters {
  /** Max total minutes per dish */
  time: number | null;
  cuisine: string[];
  dietary: string[];
  /** One-dish mode only: limit to these courses */
  course: string[];
  /** Only recipes in the person's recipe box */
  fromBox: boolean;
}

export const EMPTY_PICK_FILTERS: PickFilters = { time: null, cuisine: [], dietary: [], course: [], fromBox: false };

export type Rng = () => number;

/** Menu order: starter, main, sides, dessert */
export function buildSlots(shape: MealShape): MealSlot[] {
  const slots: MealSlot[] = [];
  if (shape.starter) slots.push({ id: 'starter', kind: 'starter' });
  if (shape.main) slots.push({ id: 'main', kind: 'main' });
  for (let i = 1; i <= Math.min(2, Math.max(0, shape.sides)); i++) slots.push({ id: `side-${i}`, kind: 'side' });
  if (shape.dessert) slots.push({ id: 'dessert', kind: 'dessert' });
  return slots;
}

const has = (cats: { uid: string }[], uids: string[]) => cats.some((c) => uids.includes(c.uid));

export function matchesFilters(r: RecipeSummary, f: PickFilters, favouriteIds: Set<string>): boolean {
  if (f.fromBox && !favouriteIds.has(r.id)) return false;
  if (f.time && (!r.total_time || r.total_time > f.time)) return false;
  if (f.cuisine.length && !has(r.cuisine_categories, f.cuisine)) return false;
  // Dietary: every chosen need must be met (vegan AND gluten free)
  if (f.dietary.length && !f.dietary.every((d) => has(r.dietary_categories, [d]))) return false;
  if (f.course.length && !has(r.course_categories, f.course)) return false;
  return true;
}

export function fitsSlot(r: RecipeSummary, kind: SlotKind): boolean {
  return has(r.course_categories, SLOT_COURSES[kind]);
}

export function pickRandom<T>(items: T[], rng: Rng = Math.random): T | null {
  if (!items.length) return null;
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/** Pick one recipe matching the filters, avoiding `avoidId` when there's a choice */
export function pickOne(
  recipes: RecipeSummary[],
  filters: PickFilters,
  favouriteIds: Set<string>,
  avoidId?: string | null,
  rng: Rng = Math.random
): RecipeSummary | null {
  const pool = recipes.filter((r) => matchesFilters(r, filters, favouriteIds));
  const fresh = pool.filter((r) => r.id !== avoidId);
  return pickRandom(fresh.length ? fresh : pool, rng);
}

export interface MealOptions {
  recipes: RecipeSummary[];
  slots: MealSlot[];
  filters: PickFilters;
  favouriteIds: Set<string>;
  /** recipe id → ids it "goes well with" (either direction) */
  pairings: Map<string, Set<string>>;
  usePairings: boolean;
  sameCuisine: boolean;
  /** Slots to keep as they are */
  locked: Record<string, RecipeSummary | null>;
  /** Current picks, so a reshuffle avoids repeating them */
  previous?: Record<string, RecipeSummary | null>;
  rng?: Rng;
}

/**
 * Fill every slot. The main is chosen first, then the others are narrowed
 * towards it: sides prefer its "goes well with" pairings, and with
 * sameCuisine every course prefers the main's cuisine. Preferences fall back
 * to the wider pool rather than leaving a slot empty; filters never do.
 */
export function pickMeal(o: MealOptions): Record<string, RecipeSummary | null> {
  const rng = o.rng ?? Math.random;
  const picks: Record<string, RecipeSummary | null> = {};
  const used = new Set<string>();

  for (const [id, r] of Object.entries(o.locked)) {
    if (r && o.slots.some((s) => s.id === id)) {
      picks[id] = r;
      used.add(r.id);
    }
  }

  const filtered = o.recipes.filter((r) => matchesFilters(r, { ...o.filters, course: [] }, o.favouriteIds));
  const order = [...o.slots].sort((a, b) => (a.kind === 'main' ? -1 : b.kind === 'main' ? 1 : 0));

  for (const slot of order) {
    if (slot.id in picks) continue;

    let pool = filtered.filter((r) => fitsSlot(r, slot.kind) && !used.has(r.id));
    const anchor = picks['main'] ?? Object.values(picks).find(Boolean) ?? null;

    if (anchor && o.sameCuisine && anchor.cuisine_categories.length) {
      const uids = anchor.cuisine_categories.map((c) => c.uid);
      const same = pool.filter((r) => has(r.cuisine_categories, uids));
      if (same.length) pool = same;
    }

    if (anchor && o.usePairings && slot.kind !== 'main') {
      const paired = o.pairings.get(anchor.id);
      const pairedPool = paired ? pool.filter((r) => paired.has(r.id)) : [];
      if (pairedPool.length) pool = pairedPool;
    }

    const prev = o.previous?.[slot.id];
    const fresh = prev ? pool.filter((r) => r.id !== prev.id) : pool;
    const choice = pickRandom(fresh.length ? fresh : pool, rng);

    picks[slot.id] = choice;
    if (choice) used.add(choice.id);
  }

  return picks;
}

/** Build a symmetric pairing map from recipe_accompanying rows */
export function buildPairings(rows: { recipe_id: string; accompanying_id: string }[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const { recipe_id, accompanying_id } of rows) {
    add(recipe_id, accompanying_id);
    add(accompanying_id, recipe_id);
  }
  return map;
}

/**
 * Rough time to get the whole meal on the table: all the prep, plus the
 * longest cook (assuming things cook side by side). Null if nothing is timed.
 */
export function mealTiming(dishes: (RecipeSummary | null)[]): number | null {
  const timed = dishes.filter((d): d is RecipeSummary => !!d && (d.prep_time != null || d.cook_time != null));
  if (!timed.length) return null;
  const prep = timed.reduce((sum, d) => sum + (d.prep_time ?? 0), 0);
  const cook = Math.max(0, ...timed.map((d) => d.cook_time ?? 0));
  return prep + cook;
}

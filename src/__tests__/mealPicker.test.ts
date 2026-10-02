import { describe, it, expect } from 'vitest';
import {
  buildSlots,
  buildPairings,
  matchesFilters,
  pickMeal,
  pickOne,
  mealTiming,
  EMPTY_PICK_FILTERS,
} from '@/lib/mealPicker';
import { parseWhatWeHaving, whatWeHavingQuery, DEFAULT_STATE } from '@/lib/whatWeHavingUrl';
import type { RecipeSummary, Category } from '@/types/recipe';

const cat = (type: Category['type'], uid: string): Category => ({ id: `${type}-${uid}`, type, uid, title: uid });

function recipe(id: string, course: string, opts: Partial<RecipeSummary> & { cuisine?: string; diet?: string[] } = {}): RecipeSummary {
  const { cuisine, diet, ...rest } = opts;
  return {
    id,
    uid: id,
    title: id,
    subtitle: '',
    short_description: '',
    feature_image_path: null,
    feature_image_alt: null,
    prep_time: 10,
    cook_time: 20,
    total_time: 30,
    course_categories: [cat('course', course)],
    cuisine_categories: cuisine ? [cat('cuisine', cuisine)] : [],
    dietary_categories: (diet ?? []).map((d) => cat('dietary', d)),
    ...rest,
  };
}

const first = () => 0; // always pick the first candidate

const souvlaki = recipe('souvlaki', 'main', { cuisine: 'greek' });
const curry = recipe('curry', 'main', { cuisine: 'indian' });
const potatoes = recipe('potatoes', 'side', { cuisine: 'greek' });
const rice = recipe('rice', 'side', { cuisine: 'indian' });
const salad = recipe('salad', 'side', { cuisine: 'greek', diet: ['veggie'] });
const houmous = recipe('houmous', 'meze', { cuisine: 'cypriot', total_time: 10, diet: ['veggie', 'vegan'] });
const baklava = recipe('baklava', 'dessert', { cuisine: 'greek', total_time: 90 });
const all = [curry, souvlaki, rice, potatoes, salad, houmous, baklava];

describe('buildSlots', () => {
  it('orders starter, main, sides, dessert and caps sides at two', () => {
    expect(buildSlots({ starter: true, main: true, sides: 5, dessert: true }).map((s) => s.id)).toEqual([
      'starter', 'main', 'side-1', 'side-2', 'dessert',
    ]);
  });
});

describe('matchesFilters', () => {
  it('requires every dietary need', () => {
    const f = { ...EMPTY_PICK_FILTERS, dietary: ['veggie', 'vegan'] };
    expect(matchesFilters(houmous, f, new Set())).toBe(true);
    expect(matchesFilters(salad, f, new Set())).toBe(false);
  });

  it('limits to the recipe box', () => {
    const f = { ...EMPTY_PICK_FILTERS, fromBox: true };
    expect(matchesFilters(curry, f, new Set(['curry']))).toBe(true);
    expect(matchesFilters(rice, f, new Set(['curry']))).toBe(false);
  });
});

describe('pickOne', () => {
  it('avoids repeating the last pick when there is another option', () => {
    const f = { ...EMPTY_PICK_FILTERS, course: ['main'] };
    expect(pickOne(all, f, new Set(), 'curry', first)?.id).toBe('souvlaki');
  });

  it('returns null when nothing matches', () => {
    expect(pickOne(all, { ...EMPTY_PICK_FILTERS, time: 5 }, new Set(), null, first)).toBeNull();
  });
});

describe('pickMeal', () => {
  const base = {
    recipes: all,
    filters: EMPTY_PICK_FILTERS,
    favouriteIds: new Set<string>(),
    pairings: new Map<string, Set<string>>(),
    usePairings: false,
    sameCuisine: false,
    locked: {},
    rng: first,
  };

  it('fills each slot from the right courses without repeats', () => {
    const picks = pickMeal({ ...base, slots: buildSlots({ starter: true, main: true, sides: 2, dessert: true }) });
    expect(picks.starter?.id).toBe('houmous');
    expect(picks.main?.id).toBe('curry');
    expect([picks['side-1']?.id, picks['side-2']?.id]).toEqual(['rice', 'potatoes']);
    expect(picks.dessert?.id).toBe('baklava');
  });

  it('prefers the main’s "goes well with" sides', () => {
    const pairings = buildPairings([{ recipe_id: 'potatoes', accompanying_id: 'curry' }]);
    const picks = pickMeal({ ...base, slots: buildSlots({ starter: false, main: true, sides: 1, dessert: false }), pairings, usePairings: true });
    expect(picks.main?.id).toBe('curry');
    expect(picks['side-1']?.id).toBe('potatoes');
  });

  it('keeps to the main’s cuisine when asked, falling back if nothing fits', () => {
    const picks = pickMeal({
      ...base,
      slots: buildSlots({ starter: true, main: true, sides: 1, dessert: false }),
      sameCuisine: true,
      locked: { main: souvlaki },
    });
    expect(picks.main?.id).toBe('souvlaki');
    expect(picks['side-1']?.id).toBe('potatoes');
    expect(picks.starter?.id).toBe('houmous'); // no Greek starter, so any starter
  });

  it('keeps locked slots and reshuffles the rest away from the previous picks', () => {
    const slots = buildSlots({ starter: false, main: true, sides: 1, dessert: false });
    const picks = pickMeal({ ...base, slots, locked: { main: curry }, previous: { main: curry, 'side-1': rice } });
    expect(picks.main?.id).toBe('curry');
    expect(picks['side-1']?.id).toBe('potatoes');
  });

  it('leaves a slot empty when the filters rule everything out', () => {
    const picks = pickMeal({ ...base, slots: buildSlots({ starter: false, main: true, sides: 0, dessert: true }), filters: { ...EMPTY_PICK_FILTERS, time: 30 } });
    expect(picks.main?.id).toBe('curry');
    expect(picks.dessert).toBeNull();
  });
});

describe('mealTiming', () => {
  it('adds up the prep and the longest cook', () => {
    expect(mealTiming([recipe('a', 'main', { prep_time: 15, cook_time: 40 }), recipe('b', 'side', { prep_time: 10, cook_time: 30 }), null])).toBe(65);
  });
});

describe('What We Having? URL state', () => {
  it('round-trips a meal with picks', () => {
    const state = {
      ...DEFAULT_STATE,
      mode: 'meal' as const,
      filters: { ...EMPTY_PICK_FILTERS, time: 45, cuisine: ['greek'] },
      shape: { starter: true, main: true, sides: 2, dessert: false },
      sameCuisine: true,
      picks: { starter: 'houmous', main: 'souvlaki' },
    };
    const query = whatWeHavingQuery(state);
    expect(query).toBe('?mode=meal&time=45&cuisine=greek&starter=1&sides=2&same=1&picks=starter:houmous,main:souvlaki');
    expect(parseWhatWeHaving(Object.fromEntries(new URLSearchParams(query)))).toEqual(state);
  });

  it('defaults to one dish with nothing set', () => {
    expect(parseWhatWeHaving({})).toEqual(DEFAULT_STATE);
    expect(whatWeHavingQuery(DEFAULT_STATE)).toBe('');
  });
});

import { EMPTY_PICK_FILTERS, type MealShape, type PickFilters } from '@/lib/mealPicker';

// What We Having? state in the URL, so a menu can be bookmarked or shared:
//   /what-we-having?mode=meal&time=45&cuisine=greek&starter=1&sides=2&same=1
//     &picks=starter:houmous,main:souvlaki,side-1:greek-lemon-roast-potatoes

export type PickMode = 'dish' | 'meal';

export interface WhatWeHavingState {
  mode: PickMode;
  filters: PickFilters;
  shape: MealShape;
  sameCuisine: boolean;
  usePairings: boolean;
  /** slot id → recipe uid ("dish" in one-dish mode) */
  picks: Record<string, string>;
}

export const DEFAULT_SHAPE: MealShape = { starter: false, main: true, sides: 1, dessert: false };

export const DEFAULT_STATE: WhatWeHavingState = {
  mode: 'dish',
  filters: EMPTY_PICK_FILTERS,
  shape: DEFAULT_SHAPE,
  sameCuisine: false,
  usePairings: true,
  picks: {},
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const list = (v: string | string[] | undefined) => one(v).split(',').map((s) => s.trim()).filter(Boolean);
const flag = (v: string | string[] | undefined, fallback: boolean) => (one(v) === '' ? fallback : one(v) === '1');

export function parseWhatWeHaving(params: Params): WhatWeHavingState {
  const time = parseInt(one(params.time), 10);
  const sides = parseInt(one(params.sides), 10);
  const picks: Record<string, string> = {};
  for (const pair of list(params.picks)) {
    const [slot, uid] = pair.split(':');
    if (slot && uid) picks[slot] = uid;
  }

  return {
    mode: one(params.mode) === 'meal' ? 'meal' : 'dish',
    filters: {
      time: [15, 30, 45, 60].includes(time) ? time : null,
      cuisine: list(params.cuisine),
      dietary: list(params.dietary),
      course: list(params.course),
      fromBox: one(params.box) === '1',
    },
    shape: {
      starter: flag(params.starter, DEFAULT_SHAPE.starter),
      main: flag(params.main, DEFAULT_SHAPE.main),
      sides: Number.isInteger(sides) ? Math.min(2, Math.max(0, sides)) : DEFAULT_SHAPE.sides,
      dessert: flag(params.dessert, DEFAULT_SHAPE.dessert),
    },
    sameCuisine: flag(params.same, false),
    usePairings: flag(params.pair, true),
    picks,
  };
}

/** Only writes values that differ from the defaults, to keep links short */
export function whatWeHavingQuery(s: WhatWeHavingState): string {
  const p = new URLSearchParams();
  if (s.mode === 'meal') p.set('mode', 'meal');
  if (s.filters.time) p.set('time', String(s.filters.time));
  if (s.filters.cuisine.length) p.set('cuisine', s.filters.cuisine.join(','));
  if (s.filters.dietary.length) p.set('dietary', s.filters.dietary.join(','));
  if (s.mode === 'dish' && s.filters.course.length) p.set('course', s.filters.course.join(','));
  if (s.filters.fromBox) p.set('box', '1');
  if (s.mode === 'meal') {
    if (s.shape.starter !== DEFAULT_SHAPE.starter) p.set('starter', s.shape.starter ? '1' : '0');
    if (s.shape.main !== DEFAULT_SHAPE.main) p.set('main', s.shape.main ? '1' : '0');
    if (s.shape.sides !== DEFAULT_SHAPE.sides) p.set('sides', String(s.shape.sides));
    if (s.shape.dessert !== DEFAULT_SHAPE.dessert) p.set('dessert', s.shape.dessert ? '1' : '0');
    if (s.sameCuisine) p.set('same', '1');
    if (!s.usePairings) p.set('pair', '0');
  }
  const picks = Object.entries(s.picks).map(([slot, uid]) => `${slot}:${uid}`);
  if (picks.length) p.set('picks', picks.join(','));
  const q = p.toString().replace(/%2C/g, ',').replace(/%3A/g, ':');
  return q ? `?${q}` : '';
}

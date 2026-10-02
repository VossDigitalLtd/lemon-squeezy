import { describe, it, expect } from 'vitest';
import { parseFilters, filtersToQuery, applyFilters, hasActiveFilters, EMPTY_FILTERS } from '@/lib/recipeFilters';
import type { RecipeSummary, Category } from '@/types/recipe';

const cat = (type: Category['type'], uid: string): Category => ({ id: `${type}-${uid}`, type, uid, title: uid });

function recipe(partial: Partial<RecipeSummary> & { id: string }): RecipeSummary {
  return {
    uid: partial.id,
    title: partial.id,
    subtitle: '',
    short_description: '',
    feature_image_path: null,
    feature_image_alt: null,
    prep_time: null,
    cook_time: null,
    total_time: null,
    course_categories: [],
    cuisine_categories: [],
    dietary_categories: [],
    ...partial,
  };
}

const houmous = recipe({ id: 'houmous', total_time: 10, course_categories: [cat('course', 'meze')], cuisine_categories: [cat('cuisine', 'cypriot')] });
const pie = recipe({ id: 'macaroni-pie', subtitle: 'Makaronia tou fournou', total_time: 90, course_categories: [cat('course', 'main')], cuisine_categories: [cat('cuisine', 'cypriot')] });
const soup = recipe({ id: 'tomato-soup', total_time: 30, course_categories: [cat('course', 'soup'), cat('course', 'main')] });
const all = [houmous, pie, soup];

describe('parseFilters', () => {
  it('reads every filter from search params', () => {
    expect(parseFilters({ q: ' lemon ', time: '30', course: 'main,side', cuisine: ['cypriot'], favourites: '1' })).toEqual({
      q: 'lemon',
      time: 30,
      favourites: true,
      course: ['main', 'side'],
      cuisine: ['cypriot'],
      dietary: [],
    });
  });

  it('ignores times that are not offered', () => {
    expect(parseFilters({ time: '20' }).time).toBeNull();
  });
});

describe('filtersToQuery', () => {
  it('round-trips through parseFilters', () => {
    const filters = { ...EMPTY_FILTERS, q: 'pie', time: 45, course: ['main', 'side'], favourites: true };
    const query = filtersToQuery(filters);
    expect(query).toBe('?q=pie&time=45&course=main,side&favourites=1');
    expect(parseFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters);
  });

  it('is empty with no filters', () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe('');
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });
});

describe('applyFilters', () => {
  const ids = (list: RecipeSummary[]) => list.map((r) => r.id);

  it('ORs within a category type and ANDs across types', () => {
    expect(ids(applyFilters(all, { ...EMPTY_FILTERS, course: ['meze', 'soup'] }))).toEqual(['houmous', 'tomato-soup']);
    expect(ids(applyFilters(all, { ...EMPTY_FILTERS, course: ['main'], cuisine: ['cypriot'] }))).toEqual(['macaroni-pie']);
  });

  it('filters by total time and leaves out untimed recipes', () => {
    const untimed = recipe({ id: 'untimed' });
    expect(ids(applyFilters([...all, untimed], { ...EMPTY_FILTERS, time: 30 }))).toEqual(['houmous', 'tomato-soup']);
  });

  it('searches the subtitle too', () => {
    expect(ids(applyFilters(all, { ...EMPTY_FILTERS, q: 'makaronia' }))).toEqual(['macaroni-pie']);
  });

  it('limits to favourites', () => {
    expect(ids(applyFilters(all, { ...EMPTY_FILTERS, favourites: true }, new Set(['tomato-soup'])))).toEqual(['tomato-soup']);
  });
});

import type { RecipeSummary, CategoryType } from '@/types/recipe';

// ─── Recipe list filters, kept in the URL ───────────────────────────────────
//   /recipes?q=lemon&time=30&course=main,side&cuisine=cypriot&favourites=1
// Within a category type filters are OR'd; everything else is AND'd.

export const FILTER_TIMES = [15, 30, 45, 60] as const;
export const CATEGORY_TYPES: CategoryType[] = ['course', 'cuisine', 'dietary'];

export interface RecipeFilters {
  q: string;
  time: number | null;
  favourites: boolean;
  course: string[];
  cuisine: string[];
  dietary: string[];
  /** Ingredient slugs; recipes must contain all of them */
  ingredient: string[];
}

export const EMPTY_FILTERS: RecipeFilters = {
  q: '',
  time: null,
  favourites: false,
  course: [],
  cuisine: [],
  dietary: [],
  ingredient: [],
};

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function list(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean))];
}

/** Read filters from Next.js searchParams (unknown values are ignored) */
export function parseFilters(params: Params): RecipeFilters {
  const time = parseInt(first(params.time), 10);
  return {
    q: first(params.q).trim(),
    time: (FILTER_TIMES as readonly number[]).includes(time) ? time : null,
    favourites: first(params.favourites) === '1',
    course: list(params.course),
    cuisine: list(params.cuisine),
    dietary: list(params.dietary),
    ingredient: list(params.ingredient),
  };
}

/** Turn filters back into a query string ('' when nothing is set) */
export function filtersToQuery(filters: RecipeFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.time) params.set('time', String(filters.time));
  for (const type of CATEGORY_TYPES) {
    if (filters[type].length) params.set(type, filters[type].join(','));
  }
  if (filters.ingredient.length) params.set('ingredient', filters.ingredient.join(','));
  if (filters.favourites) params.set('favourites', '1');
  const query = params.toString().replace(/%2C/g, ',');
  return query ? `?${query}` : '';
}

export function hasActiveFilters(filters: RecipeFilters): boolean {
  return !!(
    filters.q.trim() ||
    filters.time ||
    filters.favourites ||
    filters.course.length ||
    filters.cuisine.length ||
    filters.dietary.length ||
    filters.ingredient.length
  );
}

export function applyFilters(
  recipes: RecipeSummary[],
  filters: RecipeFilters,
  favouriteIds: Set<string> = new Set(),
  /** ingredient slug → id, for the ingredient filter */
  ingredientIds: Map<string, string> = new Map()
): RecipeSummary[] {
  const wantedIngredients = filters.ingredient.map((slug) => ingredientIds.get(slug)).filter((id): id is string => !!id);
  const q = filters.q.trim().toLowerCase();
  const categoryKeys = {
    course: 'course_categories',
    cuisine: 'cuisine_categories',
    dietary: 'dietary_categories',
  } as const;

  return recipes.filter((recipe) => {
    if (filters.favourites && !favouriteIds.has(recipe.id)) return false;
    for (const type of CATEGORY_TYPES) {
      const wanted = filters[type];
      if (wanted.length && !recipe[categoryKeys[type]].some((c) => wanted.includes(c.uid))) return false;
    }
    if (filters.time && (!recipe.total_time || recipe.total_time > filters.time)) return false;
    if (wantedIngredients.length && !wantedIngredients.every((id) => recipe.ingredient_ids?.includes(id))) return false;
    if (q) {
      const haystack = `${recipe.title} ${recipe.subtitle} ${recipe.short_description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

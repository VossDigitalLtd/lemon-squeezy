import type { UnitKey } from '@/lib/units';
import type { RestPeriod } from '@/lib/rest';
import type { MethodLinks } from '@/lib/methodLinks';

// ─── Category ────────────────────────────────────────────────────────────────

export type CategoryType = 'course' | 'cuisine' | 'dietary';

export interface Category {
  id: string;
  type: CategoryType;
  uid: string;
  title: string;
  /** Storage path in recipe-images. Only loaded where needed (admin, homepage rail). */
  image_path?: string | null;
  image_alt?: string | null;
  show_on_home?: boolean;
  sort_order?: number;
}

// ─── Ingredient ──────────────────────────────────────────────────────────────

export interface Ingredient {
  quantity: number | null;
  unit: UnitKey | null;
  name: string;
  /** Library entry this line is (see ingredients table) */
  ingredient_id?: string;
  /** Preparation: "diced", "thinly sliced" — shown after the name */
  note?: string;
}

/** An entry in the ingredient library */
export interface LibraryIngredient {
  id: string;
  name: string;
  slug: string;
  category: import('@/lib/ingredientMatch').Aisle;
  is_staple: boolean;
  /** Number of recipes using it (when requested) */
  recipe_count?: number;
}

export interface IngredientGroup {
  group_title: string;
  items: Ingredient[];
}

// ─── Method ──────────────────────────────────────────────────────────────────

export interface MethodGroup {
  group_title: string;
  items: string[];
}

// ─── Recipe (full, with joined data) ─────────────────────────────────────────

export interface Recipe {
  id: string;
  uid: string;
  title: string;
  subtitle: string;
  short_description: string;
  full_description: string;
  feature_image_path: string | null;
  feature_image_alt: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  calories_per_serving: number | null;
  /** Resting, setting, proving… in order (each counts towards total_time) */
  rest_periods: RestPeriod[];
  /** Sum of rest_periods in minutes (kept by a database trigger) */
  rest_time: number | null;
  /** prep + cook + rest, null when none is set (generated column) */
  total_time: number | null;
  ingredient_groups: IngredientGroup[];
  method_groups: MethodGroup[];
  /** Corrections to the ingredients each step mentions */
  method_links: MethodLinks;
  serving_suggestions: string;
  tips: string;
  published_at: string;
  course_categories: Category[];
  cuisine_categories: Category[];
  dietary_categories: Category[];
  accompanying_recipes: RecipeSummary[];
  created_at: string;
  updated_at: string;
}

// ─── Recipe summary (for cards, listings) ────────────────────────────────────

export interface RecipeSummary {
  id: string;
  uid: string;
  title: string;
  subtitle: string;
  short_description: string;
  feature_image_path: string | null;
  feature_image_alt: string | null;
  prep_time: number | null;
  cook_time: number | null;
  rest_time: number | null;
  total_time: number | null;
  course_categories: Category[];
  cuisine_categories: Category[];
  dietary_categories: Category[];
  /** Library ingredients used (for filtering by ingredient) */
  ingredient_ids?: string[];
}

// ─── Form data (admin create/edit) ───────────────────────────────────────────

export interface RecipeFormData {
  uid: string;
  title: string;
  subtitle: string;
  short_description: string;
  full_description: string;
  feature_image_path?: string;
  feature_image_alt?: string;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  calories_per_serving: number | null;
  rest_periods: RestPeriod[];
  ingredient_groups: IngredientGroup[];
  method_groups: MethodGroup[];
  method_links?: MethodLinks;
  serving_suggestions: string;
  tips: string;
  published_at?: string;
  course_category_ids: string[];
  cuisine_category_ids: string[];
  dietary_category_ids: string[];
  accompanying_recipe_ids: string[];
}

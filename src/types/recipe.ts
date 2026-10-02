import type { UnitKey } from '@/lib/units';

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
  /** prep_time + cook_time, null when neither is set (generated column) */
  total_time: number | null;
  ingredient_groups: IngredientGroup[];
  method_groups: MethodGroup[];
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
  total_time: number | null;
  course_categories: Category[];
  cuisine_categories: Category[];
  dietary_categories: Category[];
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
  ingredient_groups: IngredientGroup[];
  method_groups: MethodGroup[];
  serving_suggestions: string;
  tips: string;
  published_at?: string;
  course_category_ids: string[];
  cuisine_category_ids: string[];
  dietary_category_ids: string[];
  accompanying_recipe_ids: string[];
}

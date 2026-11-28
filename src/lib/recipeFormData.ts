import type { Recipe, RecipeFormData } from '@/types/recipe';

/**
 * A saved recipe in the shape the save takes (RecipeFormData). Used to fill
 * the editor, and for revisions: restoring one is saving its snapshot again.
 */
export function recipeToFormData(recipe: Recipe): RecipeFormData {
  return {
    uid: recipe.uid,
    title: recipe.title,
    subtitle: recipe.subtitle,
    short_description: recipe.short_description,
    full_description: recipe.full_description,
    feature_image_path: recipe.feature_image_path || undefined,
    feature_image_alt: recipe.feature_image_alt || undefined,
    feature_image_focus_x: recipe.feature_image_focus_x ?? null,
    feature_image_focus_y: recipe.feature_image_focus_y ?? null,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    servings: recipe.servings,
    calories_per_serving: recipe.calories_per_serving,
    rest_periods: recipe.rest_periods ?? [],
    ingredient_groups: recipe.ingredient_groups,
    method_groups: recipe.method_groups,
    method_links: recipe.method_links,
    serving_suggestions: recipe.serving_suggestions,
    tips: recipe.tips,
    inspiration: recipe.inspiration,
    status: recipe.status,
    published_at: recipe.published_at || undefined,
    course_category_ids: recipe.course_categories.map((c) => c.id),
    cuisine_category_ids: recipe.cuisine_categories.map((c) => c.id),
    dietary_category_ids: recipe.dietary_categories.map((c) => c.id),
    accompanying_recipe_ids: recipe.accompanying_recipes.map((r) => r.id),
  };
}

import { createClient, getUserId } from '@/lib/supabase/server';
import { RecipeService, CategoryService, FavouriteService, IngredientService } from '@/lib/supabase/services';
import { parseFilters, filtersToQuery } from '@/lib/recipeFilters';
import RecipeListClient from './RecipeListClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recipes',
  description: 'Browse our collection of simple, delicious recipes.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  // Checked locally, so the user's favourites load alongside everything else
  const userId = await getUserId(supabase);

  const [recipesResult, categoriesResult, favResult, params, ingredientsResult] = await Promise.all([
    RecipeService.getAll(supabase, { limit: 100 }),
    CategoryService.getAllGrouped(supabase),
    userId ? FavouriteService.getUserFavouriteIds(supabase, userId) : null,
    searchParams,
    IngredientService.list(supabase),
  ]);
  // Offer ingredients that recipes actually use, leaving out cupboard staples
  const ingredients = (ingredientsResult.success ? ingredientsResult.data! : []).filter((i) => !i.is_staple && (i.recipe_count ?? 0) > 0);

  const favouriteIds = favResult?.success ? favResult.data! : [];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-8">
      {/* Remount when a link changes the filters (e.g. header "Quick meals" while on this page) */}
      <RecipeListClient
        key={filtersToQuery(parseFilters(params))}
        initialRecipes={recipesResult.success ? recipesResult.data! : []}
        categories={categoriesResult.success ? categoriesResult.data! : { courses: [], cuisines: [], dietaries: [] }}
        favouriteIds={favouriteIds}
        isLoggedIn={!!userId}
        initialFilters={parseFilters(params)}
        ingredients={ingredients}
      />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { RecipeService, CategoryService, FavouriteService } from '@/lib/supabase/services';
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

  const [recipesResult, categoriesResult, userResult, params] = await Promise.all([
    RecipeService.getAll(supabase, { limit: 100 }),
    CategoryService.getAllGrouped(supabase),
    supabase.auth.getUser(),
    searchParams,
  ]);

  const user = userResult.data?.user;
  let favouriteIds: string[] = [];
  if (user) {
    const favResult = await FavouriteService.getUserFavouriteIds(supabase, user.id);
    if (favResult.success) {
      favouriteIds = favResult.data!;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-8">
      {/* Remount when a link changes the filters (e.g. header "Quick meals" while on this page) */}
      <RecipeListClient
        key={filtersToQuery(parseFilters(params))}
        initialRecipes={recipesResult.success ? recipesResult.data! : []}
        categories={categoriesResult.success ? categoriesResult.data! : { courses: [], cuisines: [], dietaries: [] }}
        favouriteIds={favouriteIds}
        isLoggedIn={!!user}
        initialFilters={parseFilters(params)}
      />
    </div>
  );
}

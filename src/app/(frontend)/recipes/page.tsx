import { createClient } from '@/lib/supabase/server';
import { RecipeService, CategoryService, FavouriteService } from '@/lib/supabase/services';
import RecipeListClient from './RecipeListClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recipes',
  description: 'Browse our collection of simple, delicious recipes.',
};

export default async function RecipesPage() {
  const supabase = await createClient();

  const [recipesResult, categoriesResult, userResult] = await Promise.all([
    RecipeService.getAll(supabase, { limit: 100 }),
    CategoryService.getAllGrouped(supabase),
    supabase.auth.getUser(),
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Recipes</h1>
        <p className="text-muted-foreground mt-2">
          Browse our collection of simple, delicious recipes.
        </p>
      </div>

      <RecipeListClient
        initialRecipes={recipesResult.success ? recipesResult.data! : []}
        categories={categoriesResult.success ? categoriesResult.data! : { courses: [], cuisines: [], dietaries: [] }}
        favouriteIds={favouriteIds}
        isLoggedIn={!!user}
      />
    </div>
  );
}

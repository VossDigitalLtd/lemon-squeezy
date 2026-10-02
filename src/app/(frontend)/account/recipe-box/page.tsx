import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FavouriteService } from '@/lib/supabase/services';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { FavouriteHeart } from '@/components/recipe/FavouriteHeart';
import { AccountPageHeader, pillButton } from '@/components/account/AccountUI';
import { cn } from '@/utils/cn';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Recipe box' };

export default async function RecipeBoxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const result = await FavouriteService.getUserFavourites(supabase, user!.id);
  const recipes = result.success ? result.data! : [];

  return (
    <div>
      <AccountPageHeader
        title="Recipe box"
        intro={
          recipes.length
            ? `${recipes.length} saved recipe${recipes.length === 1 ? '' : 's'}, most recent first. Tap a heart to remove one.`
            : 'Everything you heart ends up here.'
        }
      />

      {recipes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.map((r, i) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                priority={i < 3}
                sizes="(min-width: 1280px) 22vw, (min-width: 640px) 40vw, 100vw"
                action={<FavouriteHeart recipeId={r.id} recipeTitle={r.title} initialFavourited />}
              />
            ))}
          </div>
          <p className="mt-10 text-muted-foreground">
            Want to narrow it down?{' '}
            <Link href="/recipes?favourites=1" className="border-b-2 border-primary font-medium text-foreground">
              Filter your saved recipes by time or course
            </Link>
          </p>
        </>
      ) : (
        <div className="rounded-2xl bg-brand-muted p-8 sm:p-10">
          <p className="font-display text-2xl">Nothing saved yet</p>
          <p className="mt-2 max-w-md text-muted-foreground">
            Tap the heart on any recipe to keep it here, ready for the next time you&rsquo;re wondering what to cook.
          </p>
          <Link href="/recipes" className={cn(pillButton.base, pillButton.primary, 'mt-6')}>
            Browse recipes <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}

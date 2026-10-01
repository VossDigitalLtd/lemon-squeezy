import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Flame, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RecipeService, FavouriteService } from '@/lib/supabase/services';
import { getImageUrl, textToHtml } from '@/lib/recipes';
import { formatIngredient } from '@/lib/units';
import RecipeContentClient from './RecipeContentClient';
import { FavouriteButton } from '@/components/recipe/FavouriteButton';
import type { Metadata } from 'next';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: Promise<{ uid: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uid } = await params;
  const supabase = await createClient();
  const result = await RecipeService.getByUid(supabase, uid);

  if (!result.success || !result.data) {
    return { title: 'Recipe Not Found' };
  }

  const recipe = result.data;
  const imageUrl = getImageUrl(recipe.feature_image_path);

  return {
    title: recipe.title,
    description: recipe.short_description,
    openGraph: {
      title: recipe.title,
      description: recipe.short_description,
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
  };
}

export default async function RecipePage({ params }: PageProps) {
  const { uid } = await params;
  const supabase = await createClient();
  const result = await RecipeService.getByUid(supabase, uid);

  if (!result.success || !result.data) {
    notFound();
  }

  const recipe = result.data;
  const imageUrl = getImageUrl(recipe.feature_image_path);
  const allCategories = [
    ...recipe.course_categories,
    ...recipe.cuisine_categories,
    ...recipe.dietary_categories,
  ];

  // Check favourite status for logged-in users
  const { data: { user } } = await supabase.auth.getUser();
  const isFavourited = user
    ? await FavouriteService.isFavourited(supabase, user.id, recipe.id)
    : false;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{recipe.title}</h1>
        {recipe.short_description && (
          <p className="text-lg text-muted-foreground mt-3">{recipe.short_description}</p>
        )}

        {/* Categories */}
        {allCategories.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {allCategories.map((cat) => (
              <span
                key={cat.id}
                className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
              >
                {cat.title}
              </span>
            ))}
          </div>
        )}

        {/* Meta bar */}
        <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground flex-wrap">
          {recipe.prep_time != null && (
            <div className="flex items-center gap-1.5">
              <Clock size={16} />
              <span>Prep: {recipe.prep_time} min</span>
            </div>
          )}
          {recipe.cook_time != null && (
            <div className="flex items-center gap-1.5">
              <Clock size={16} />
              <span>Cook: {recipe.cook_time} min</span>
            </div>
          )}
          {recipe.servings != null && (
            <div className="flex items-center gap-1.5">
              <Users size={16} />
              <span>Serves {recipe.servings}</span>
            </div>
          )}
          {recipe.calories_per_serving != null && (
            <div className="flex items-center gap-1.5">
              <Flame size={16} />
              <span>{recipe.calories_per_serving} cal</span>
            </div>
          )}
          <FavouriteButton
            recipeId={recipe.id}
            initialFavourited={isFavourited}
            isLoggedIn={!!user}
          />
        </div>
      </div>

      {/* Feature image */}
      {imageUrl && (
        <div className="aspect-[16/9] relative rounded-xl overflow-hidden mb-8">
          <Image
            src={imageUrl}
            alt={recipe.feature_image_alt || recipe.title}
            fill
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        </div>
      )}

      {/* Full description */}
      {recipe.full_description && (
        <div
          className="prose prose-sm max-w-none mb-8 text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: textToHtml(recipe.full_description) }}
        />
      )}

      {/* Interactive content — ingredients with scaling + method */}
      <RecipeContentClient recipe={recipe} />

      {/* Serving suggestions */}
      {recipe.serving_suggestions && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">Serving Suggestions</h2>
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: textToHtml(recipe.serving_suggestions) }}
          />
        </section>
      )}

      {/* Tips */}
      {recipe.tips && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">Tips</h2>
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: textToHtml(recipe.tips) }}
          />
        </section>
      )}

      {/* Accompanying recipes */}
      {recipe.accompanying_recipes.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Goes Well With</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recipe.accompanying_recipes.map((r) => {
              const img = getImageUrl(r.feature_image_path);
              return (
                <Link
                  key={r.id}
                  href={`/${r.uid}`}
                  className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/20 transition-colors"
                >
                  {img && (
                    <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <Image src={img} alt={r.title} fill className="object-cover" sizes="64px" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{r.short_description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* JSON-LD */}
      <RecipeJsonLd recipe={recipe} imageUrl={imageUrl} />
    </article>
  );
}

function RecipeJsonLd({ recipe, imageUrl }: { recipe: Recipe; imageUrl: string | null }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.short_description,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(recipe.prep_time ? { prepTime: `PT${recipe.prep_time}M` } : {}),
    ...(recipe.cook_time ? { cookTime: `PT${recipe.cook_time}M` } : {}),
    ...(recipe.prep_time && recipe.cook_time
      ? { totalTime: `PT${recipe.prep_time + recipe.cook_time}M` }
      : {}),
    ...(recipe.servings ? { recipeYield: `${recipe.servings} servings` } : {}),
    ...(recipe.calories_per_serving
      ? { nutrition: { '@type': 'NutritionInformation', calories: `${recipe.calories_per_serving} calories` } }
      : {}),
    recipeCategory: recipe.course_categories.map((c) => c.title),
    recipeCuisine: recipe.cuisine_categories.map((c) => c.title),
    recipeIngredient: recipe.ingredient_groups.flatMap((g) =>
      g.items.map((item) => formatIngredient(item))
    ),
    recipeInstructions: recipe.method_groups.flatMap((g) =>
      g.items.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: step,
      }))
    ),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

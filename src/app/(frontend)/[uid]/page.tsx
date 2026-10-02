import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, Flame, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RecipeService, FavouriteService } from '@/lib/supabase/services';
import { getImageUrl, textToHtml } from '@/lib/recipes';
import { formatIngredient } from '@/lib/units';
import RecipeContentClient from './RecipeContentClient';
import { FavouriteButton } from '@/components/recipe/FavouriteButton';
import { CookModeButton } from '@/components/recipe/CookModeButton';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { RecipeViewTracker } from '@/components/recipe/RecipeViewTracker';
import { LogoTimer, LogoRays, LaceBand } from '@/components/brand';
import { formatMinutesLong } from '@/lib/time';
import { cn } from '@/utils/cn';
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
    title: recipe.subtitle ? `${recipe.title} (${recipe.subtitle})` : recipe.title,
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
  const course = recipe.course_categories[0];

  // Check favourite status for logged-in users
  const { data: { user } } = await supabase.auth.getUser();
  const isFavourited = user
    ? await FavouriteService.isFavourited(supabase, user.id, recipe.id)
    : false;

  return (
    <>
      <article className="mx-auto max-w-7xl px-4 sm:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-1.5 pt-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground hover:underline">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/recipes" className="hover:text-foreground hover:underline">Recipes</Link>
          {course && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/recipes?course=${course.uid}`} className="hover:text-foreground hover:underline">
                {course.title}
              </Link>
            </>
          )}
        </nav>

        {/* Header */}
        <header className={cn('grid gap-8 pt-5', imageUrl && 'lg:grid-cols-2 lg:items-center lg:gap-16')}>
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[1.05] text-balance">
              {recipe.title}
            </h1>
            {recipe.subtitle && (
              <p className="mt-2.5 font-display text-[1.375rem] italic text-muted-foreground">{recipe.subtitle}</p>
            )}
            {recipe.short_description && (
              <p className="mt-5 max-w-[34rem] text-lg">{recipe.short_description}</p>
            )}

            {allCategories.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {allCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/recipes?${cat.type}=${cat.uid}`}
                    className={cn(
                      'rounded-full border px-3 py-0.5 text-[0.8125rem] transition-colors hover:border-foreground',
                      cat.uid === 'cypriot' ? 'border-lace bg-brand-muted' : 'border-border'
                    )}
                  >
                    {cat.uid === 'cypriot' ? 'From a Cypriot kitchen' : cat.title}
                  </Link>
                ))}
              </div>
            )}

            {/* Facts */}
            <div className="mt-8 flex flex-wrap gap-x-9 gap-y-5 border-y border-border py-6">
              {recipe.prep_time != null && (
                <Fact icon={<LogoTimer minutes={recipe.prep_time} label="" className="size-15" />} label="Prep time">
                  {formatMinutesLong(recipe.prep_time)}
                </Fact>
              )}
              {recipe.cook_time != null && recipe.cook_time > 0 && (
                <Fact icon={<LogoTimer minutes={recipe.cook_time} label="" className="size-15" />} label="Cook time">
                  {formatMinutesLong(recipe.cook_time)}
                </Fact>
              )}
              {recipe.servings != null && (
                <Fact icon={<Users size={30} strokeWidth={1.6} />} label="Serves">
                  {recipe.servings}
                </Fact>
              )}
              {recipe.calories_per_serving != null && (
                <Fact icon={<Flame size={30} strokeWidth={1.6} />} label="Calories">
                  {recipe.calories_per_serving} per serving
                </Fact>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                href="#recipe"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[0.9375rem] font-medium text-primary-foreground transition hover:brightness-95"
              >
                <ArrowDown size={17} />
                Jump to recipe
              </a>
              <FavouriteButton recipeId={recipe.id} recipeTitle={recipe.title} initialFavourited={isFavourited} isLoggedIn={!!user} />
              <CookModeButton />
            </div>
          </div>

          {imageUrl && (
            <div className="relative order-first aspect-[16/10] overflow-hidden rounded-2xl bg-muted lg:order-none lg:aspect-[4/5]">
              <Image
                src={imageUrl}
                alt={recipe.feature_image_alt || recipe.title}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            </div>
          )}
        </header>

        {/* Full description */}
        {recipe.full_description && (
          <div
            className="mt-12 max-w-2xl space-y-4 text-lg leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: textToHtml(recipe.full_description) }}
          />
        )}

        {/* Ingredients + method, with tips and serving suggestions under the method */}
        <div className="pt-16">
          <RecipeContentClient recipe={recipe}>
            {recipe.serving_suggestions && (
              <Note title="Serving suggestions" html={textToHtml(recipe.serving_suggestions)} />
            )}
            {recipe.tips && <Note title="Tips" html={textToHtml(recipe.tips)} />}
          </RecipeContentClient>
        </div>
      </article>

      {/* Goes well with */}
      {recipe.accompanying_recipes.length > 0 && (
        <>
          <LaceBand className="mt-20" />
          <section aria-labelledby="pairs-title" className="mx-auto max-w-7xl px-4 pt-12 sm:px-8">
            <h2 id="pairs-title" className="font-display text-[clamp(1.875rem,3.4vw,2.5rem)] leading-tight">
              Goes well with
            </h2>
            <p className="mt-1.5 text-muted-foreground">Make it a meal.</p>
            <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {recipe.accompanying_recipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
              ))}
            </div>
          </section>
        </>
      )}


      <RecipeJsonLd recipe={recipe} imageUrl={imageUrl} />
    </>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-15 place-items-center">{icon}</span>
      <div>
        <p className="font-display text-[1.1875rem] leading-tight">{label}</p>
        <p className="tabular-nums">{children}</p>
      </div>
    </div>
  );
}

function Note({ title, html }: { title: string; html: string }) {
  return (
    <aside className="mt-10 grid grid-cols-[auto_1fr] gap-5 rounded-2xl border border-border p-6">
      <svg viewBox="0 0 180 180" className="size-12 text-primary-foreground" aria-hidden="true">
        <circle cx="90" cy="90" r="90" className="fill-primary" />
        <LogoRays />
      </svg>
      <div className="min-w-0">
        <h2 className="font-display text-2xl leading-tight">{title}</h2>
        <div className="mt-2 space-y-3 text-[1.0625rem]" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </aside>
  );
}

function RecipeJsonLd({ recipe, imageUrl }: { recipe: Recipe; imageUrl: string | null }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    ...(recipe.subtitle ? { alternateName: recipe.subtitle } : {}),
    description: recipe.short_description,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(recipe.prep_time ? { prepTime: `PT${recipe.prep_time}M` } : {}),
    ...(recipe.cook_time ? { cookTime: `PT${recipe.cook_time}M` } : {}),
    ...(recipe.total_time ? { totalTime: `PT${recipe.total_time}M` } : {}),
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

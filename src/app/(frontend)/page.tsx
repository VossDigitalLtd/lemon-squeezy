import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RecipeService, CategoryService, FavouriteService } from '@/lib/supabase/services';
import { LogoTimer, LaceBand } from '@/components/brand';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { FavouriteHeart } from '@/components/recipe/FavouriteHeart';
import { FavouriteButton } from '@/components/recipe/FavouriteButton';
import { ShuffleBand } from '@/components/home/ShuffleBand';
import { getImageUrl } from '@/lib/recipes';
import { bucketByTime, formatMinutesLong, formatMinutesShort } from '@/lib/time';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/config/app';
import type { Metadata } from 'next';
import type { RecipeSummary } from '@/types/recipe';

export const metadata: Metadata = {
  title: { absolute: APP_NAME },
  description: APP_DESCRIPTION,
};

const TIME_LABELS: Record<number, string> = {
  15: 'Under 15 min',
  30: 'Under 30 min',
  45: 'Under 45 min',
  60: 'Under an hour',
};

export default async function HomePage() {
  const supabase = await createClient();

  const [featuredResult, recipesResult, categoriesResult, cypriotResult, userResult] = await Promise.all([
    RecipeService.getFeatured(supabase),
    RecipeService.getAll(supabase, { limit: 100 }),
    CategoryService.getHomeCategories(supabase),
    RecipeService.getByCategoryUid(supabase, 'cuisine', 'cypriot', { limit: 8 }),
    supabase.auth.getUser(),
  ]);

  const featured = featuredResult.success ? featuredResult.data : null;
  const recipes = recipesResult.success ? recipesResult.data! : [];
  const homeCategories = categoriesResult.success ? categoriesResult.data! : [];
  const cypriot = cypriotResult.success ? cypriotResult.data! : [];
  const user = userResult.data?.user;

  const [favouritesResult, favouriteIdsResult] = user
    ? await Promise.all([
        FavouriteService.getUserFavourites(supabase, user.id, { limit: 12 }),
        FavouriteService.getUserFavouriteIds(supabase, user.id),
      ])
    : [null, null];
  const favourites = favouritesResult?.success ? favouritesResult.data! : [];
  const favouriteIds = new Set(favouriteIdsResult?.success ? favouriteIdsResult.data! : []);

  const latest = recipes.filter((r) => r.feature_image_path && r.id !== featured?.id).slice(0, 5);
  const buckets = bucketByTime(recipes);
  const cypriotLead = cypriot.find((r) => r.feature_image_path);
  const cypriotRest = cypriot.filter((r) => r.id !== cypriotLead?.id).slice(0, 4);

  const heart = (r: RecipeSummary) =>
    user ? <FavouriteHeart recipeId={r.id} recipeTitle={r.title} initialFavourited={favouriteIds.has(r.id)} /> : undefined;

  return (
    <>
      {/* ── Recipe of the week ── */}
      {featured && (
        <section aria-labelledby="hero-title" className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 sm:px-8 lg:grid-cols-[5fr_6fr] lg:items-center lg:gap-14 lg:pt-12">
          <Link
            href={`/${featured.uid}`}
            className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-muted lg:order-2"
            aria-label={featured.title}
          >
            {featured.feature_image_path && (
              <Image
                src={getImageUrl(featured.feature_image_path)!}
                alt={featured.feature_image_alt || ''}
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            )}
            <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">
              Recipe of the week
            </span>
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              {[
                featured.course_categories[0]?.title,
                featured.cuisine_categories[0]?.title,
                featured.servings ? `Serves ${featured.servings}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <h1 id="hero-title" className="mt-3 font-display text-[clamp(2.5rem,5.4vw,4.25rem)] leading-[1.05] text-balance">
              {featured.title}
            </h1>
            {featured.subtitle && (
              <p className="mt-2.5 font-display text-xl italic text-muted-foreground">{featured.subtitle}</p>
            )}
            {featured.short_description && <p className="mt-5 max-w-[34rem] text-[1.0625rem]">{featured.short_description}</p>}
            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-5">
              {featured.prep_time != null && (
                <HeroTime label="Prep time" minutes={featured.prep_time} />
              )}
              {featured.cook_time != null && featured.cook_time > 0 && (
                <HeroTime label="Cook time" minutes={featured.cook_time} />
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${featured.uid}`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition hover:brightness-95"
              >
                Get the recipe <ArrowRight size={17} />
              </Link>
              <FavouriteButton recipeId={featured.id} initialFavourited={favouriteIds.has(featured.id)} isLoggedIn={!!user} className="h-12" />
            </div>
          </div>
        </section>
      )}

      {/* ── How long have you got? ── */}
      <Section id="quick" title="How long have you got?" intro="Total time, from chopping board to plate.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {buckets.map((b) => (
            <Link
              key={b.minutes}
              href={`/recipes?time=${b.minutes}`}
              className="grid grid-cols-1 content-start gap-x-4 gap-y-1 rounded-2xl bg-brand-muted p-5 transition hover:-translate-y-0.5 hover:bg-primary/30 xl:grid-cols-[auto_1fr] xl:items-center"
            >
              <LogoTimer minutes={b.minutes} label={TIME_LABELS[b.minutes]} className="mb-3 size-15 xl:row-span-2 xl:mb-0 xl:size-18" />
              <span className="font-display text-2xl leading-tight">{TIME_LABELS[b.minutes]}</span>
              <span className="line-clamp-2 min-w-0 text-[0.8125rem] text-muted-foreground">
                {b.count} recipe{b.count === 1 ? '' : 's'}
                {b.examples.length > 0 && ` · like ${b.examples.map((e) => e.title).join(', ')}`}
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── Categories ── */}
      {homeCategories.length > 0 && (
        <Section title="What are you in the mood for?" more={{ href: '/recipes', label: 'All recipes' }}>
          <div className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 xl:justify-between xl:overflow-visible">
            {homeCategories.map((cat) => {
              const img = getImageUrl(cat.image_path ?? null);
              return (
                <Link
                  key={cat.id}
                  href={`/recipes?${cat.type}=${cat.uid}`}
                  className="group grid w-26 flex-shrink-0 justify-items-center gap-2.5 text-center text-[0.9375rem] font-medium"
                >
                  <span className="block size-26 rounded-full border-2 border-transparent p-1 transition-colors group-hover:border-primary">
                    <span className="relative block size-full overflow-hidden rounded-full bg-muted">
                      {img && (
                        <Image
                          src={img}
                          alt=""
                          fill
                          sizes="104px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </span>
                  </span>
                  {cat.title}
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Latest ── */}
      {latest.length > 0 && (
        <Section
          title="Fresh off the chopping board"
          intro="The newest recipes in the collection."
          more={{ href: '/recipes', label: 'See all recipes' }}
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr] lg:grid-rows-[auto_auto]">
            {latest.map((r, i) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                variant={i === 0 ? 'lead' : 'default'}
                className={i === 0 ? 'lg:row-span-2' : undefined}
                action={heart(r)}
                sizes={i === 0 ? '(min-width: 1024px) 45vw, (min-width: 640px) 50vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── Recipe box ── */}
      {user && (
        <Section
          title={
            <>
              Your recipe box{' '}
              <span className="ml-1 align-middle font-sans text-sm font-medium text-red-600 dark:text-red-400">
                ♥ {favouriteIds.size}
              </span>
            </>
          }
          intro="Everything you've hearted, ready when you are."
          more={favourites.length ? { href: '/recipes?favourites=1', label: 'Open recipe box' } : undefined}
        >
          {favourites.length > 0 ? (
            <div className="-mx-4 grid snap-x snap-mandatory auto-cols-[minmax(15rem,calc((100%-4.5rem)/4))] grid-flow-col justify-start gap-6 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
              {/* Fixed card width (a quarter of the row, at least 15rem) so one or two
                  saved recipes don't stretch to fill the whole row */}
              {favourites.map((r) => (
                <RecipeCard key={r.id} recipe={r} action={heart(r)} className="snap-start" sizes="280px" />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Tap the heart on any recipe to save it here.
            </p>
          )}
        </Section>
      )}

      {/* ── Kopiaste: Cypriot recipes ── */}
      {cypriotLead && (
        <section aria-labelledby="kop-title" className="mt-20 bg-brand-muted">
          <LaceBand />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[6fr_5fr] lg:items-center lg:gap-16">
            <Link href={`/${cypriotLead.uid}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={getImageUrl(cypriotLead.feature_image_path)!}
                alt={cypriotLead.feature_image_alt || ''}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-10 font-display text-[1.375rem] leading-tight text-white">
                {cypriotLead.title}
                {cypriotLead.subtitle && (
                  <small className="mt-0.5 block font-sans text-[0.8125rem] opacity-85">{cypriotLead.subtitle}</small>
                )}
              </span>
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">From a Cypriot kitchen</p>
              <h2 id="kop-title" className="mt-3 font-display text-[clamp(3rem,7vw,5rem)] leading-[0.95]">Kopiaste!</h2>
              <p className="mt-2 font-display text-[1.375rem] italic text-muted-foreground">
                Κοπιάστε · come in, sit down, eat with us
              </p>
              <p className="mt-5 max-w-[30rem]">
                Family recipes with Cypriot roots. Slow oven bakes, halloumi in the bread basket and lemons on almost
                everything. There&rsquo;s always room for one more at the table.
              </p>
              {cypriotRest.length > 0 && (
                <ul className="mt-7 border-t border-lace">
                  {cypriotRest.map((r) => {
                    const img = getImageUrl(r.feature_image_path);
                    return (
                      <li key={r.id} className="border-b border-lace">
                        <Link href={`/${r.uid}`} className="group flex items-center gap-4 py-3.5">
                          <span className="relative size-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                            {img && <Image src={img} alt="" fill sizes="56px" className="object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block font-display text-[1.1875rem] font-normal leading-tight decoration-primary decoration-[3px] underline-offset-[3px] group-hover:underline">
                              {r.title}
                            </strong>
                            <small className="text-[0.8125rem] text-muted-foreground">
                              {[r.course_categories[0]?.title, r.total_time ? formatMinutesShort(r.total_time) : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </small>
                          </span>
                          {r.total_time ? <LogoTimer minutes={r.total_time} label="" className="size-8" /> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href="/recipes?cuisine=cypriot"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-6 font-medium transition-colors hover:border-foreground"
              >
                Browse Cypriot recipes <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <LaceBand flip />
        </section>
      )}

      {/* ── What We Having? ── */}
      <ShuffleBand recipes={recipes} className={cypriotLead ? undefined : 'mt-20'} />
    </>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function HeroTime({ label, minutes }: { label: string; minutes: number }) {
  return (
    <div className="flex items-center gap-3">
      <LogoTimer minutes={minutes} label="" className="size-15" />
      <div>
        <p className="font-display text-[1.1875rem] leading-tight">{label}</p>
        <p className="tabular-nums">{formatMinutesLong(minutes)}</p>
      </div>
    </div>
  );
}

interface SectionProps {
  id?: string;
  title: React.ReactNode;
  intro?: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}

function Section({ id, title, intro, more, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-18 sm:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h2 className="font-display text-[clamp(1.875rem,3.4vw,2.5rem)] leading-tight">{title}</h2>
          {intro && <p className="mt-1.5 text-muted-foreground">{intro}</p>}
        </div>
        {more && (
          <Link
            href={more.href}
            className="inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-primary pb-0.5 text-[0.9375rem] font-medium"
          >
            {more.label} <ArrowRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

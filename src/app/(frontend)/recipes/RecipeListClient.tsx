'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart, Search, SlidersHorizontal, X } from 'lucide-react';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { FavouriteHeart } from '@/components/recipe/FavouriteHeart';
import { LogoTimer } from '@/components/brand';
import {
  applyFilters,
  filtersToQuery,
  hasActiveFilters,
  EMPTY_FILTERS,
  FILTER_TIMES,
  type RecipeFilters,
} from '@/lib/recipeFilters';
import { cn } from '@/utils/cn';
import type { RecipeSummary, Category, CategoryType } from '@/types/recipe';

const TIME_LABELS: Record<number, string> = {
  15: 'Under 15 min',
  30: 'Under 30 min',
  45: 'Under 45 min',
  60: 'Under an hour',
};

interface RecipeListClientProps {
  initialRecipes: RecipeSummary[];
  categories: {
    courses: Category[];
    cuisines: Category[];
    dietaries: Category[];
  };
  favouriteIds: string[];
  isLoggedIn: boolean;
  initialFilters: RecipeFilters;
}

export default function RecipeListClient({
  initialRecipes,
  categories,
  favouriteIds,
  isLoggedIn,
  initialFilters,
}: RecipeListClientProps) {
  const [filters, setFilters] = useState<RecipeFilters>(initialFilters);
  const [localFavourites, setLocalFavourites] = useState<Set<string>>(() => new Set(favouriteIds));
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);

  // Keep the address bar in step with the filters, so lists can be shared,
  // bookmarked and linked to from the homepage (no server round trip).
  useEffect(() => {
    const url = `${window.location.pathname}${filtersToQuery(filters)}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', url);
    }
  }, [filters]);

  const filtered = useMemo(
    () => applyFilters(initialRecipes, filters, localFavourites),
    [initialRecipes, filters, localFavourites]
  );
  const active = hasActiveFilters(filters);

  const categoryByUid = useMemo(() => {
    const map: Record<CategoryType, Map<string, Category>> = { course: new Map(), cuisine: new Map(), dietary: new Map() };
    for (const c of [...categories.courses, ...categories.cuisines, ...categories.dietaries]) map[c.type].set(c.uid, c);
    return map;
  }, [categories]);

  const activeCount =
    (filters.time ? 1 : 0) +
    (filters.favourites ? 1 : 0) +
    filters.course.length +
    filters.cuisine.length +
    filters.dietary.length;

  function update(patch: Partial<RecipeFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function toggleCategory(type: CategoryType, uid: string) {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(uid) ? prev[type].filter((u) => u !== uid) : [...prev[type], uid],
    }));
  }

  async function handleToggleFavourite(recipeId: string) {
    const flip = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    };
    setLocalFavourites(flip); // optimistic
    try {
      const res = await fetch(`/api/recipe/${recipeId}/favourite`, { method: 'POST' });
      if (!res.ok) setLocalFavourites(flip);
    } catch {
      setLocalFavourites(flip);
    }
  }

  // Page heading follows a single, simple filter: "Cypriot recipes", "Under 30 min"
  const heading = (() => {
    if (filters.favourites && activeCount === 1 && !filters.q) return 'Your recipe box';
    if (activeCount === 1 && !filters.q) {
      if (filters.time) return TIME_LABELS[filters.time];
      for (const type of ['cuisine', 'course', 'dietary'] as const) {
        const uid = filters[type][0];
        const cat = uid ? categoryByUid[type].get(uid) : undefined;
        if (cat) return `${cat.title} recipes`;
      }
    }
    return 'Recipes';
  })();

  // Chips for what's switched on, shown above the grid
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(filters.q ? [{ key: 'q', label: `“${filters.q}”`, remove: () => update({ q: '' }) }] : []),
    ...(filters.time ? [{ key: 'time', label: TIME_LABELS[filters.time], remove: () => update({ time: null }) }] : []),
    ...(filters.favourites ? [{ key: 'fav', label: 'My favourites', remove: () => update({ favourites: false }) }] : []),
    ...(['course', 'cuisine', 'dietary'] as const).flatMap((type) =>
      filters[type].map((uid) => ({
        key: `${type}-${uid}`,
        label: categoryByUid[type].get(uid)?.title ?? uid,
        remove: () => toggleCategory(type, uid),
      }))
    ),
  ];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-none">{heading}</h1>
          <p className="mt-2.5 text-muted-foreground tabular-nums" aria-live="polite">
            {active
              ? `${filtered.length} of ${initialRecipes.length} recipes`
              : `${initialRecipes.length} simple, delicious recipes`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFiltersOnMobile((v) => !v)}
          aria-expanded={showFiltersOnMobile}
          aria-controls="recipe-filters"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[0.9375rem] font-medium lg:hidden"
        >
          <SlidersHorizontal size={17} />
          Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
      </header>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        {/* ── Filters ── */}
        <aside
          id="recipe-filters"
          aria-label="Filter recipes"
          className={cn('flex-shrink-0 lg:block lg:w-60', !showFiltersOnMobile && 'hidden')}
        >
          <div className="space-y-7 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto lg:pb-4">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="recipe-search"
                type="search"
                placeholder="Search recipes…"
                aria-label="Search recipes"
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-10 text-[0.9375rem] text-foreground shadow-card placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
              />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => update({ q: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Total time */}
            <FilterGroup label="Total time">
              {FILTER_TIMES.map((t) => (
                <Pill key={t} active={filters.time === t} onClick={() => update({ time: filters.time === t ? null : t })}>
                  <LogoTimer minutes={t} label="" className="-ml-1 size-5" />
                  {TIME_LABELS[t]}
                </Pill>
              ))}
            </FilterGroup>

            {isLoggedIn && (
              <FilterGroup label="Favourites">
                <button
                  type="button"
                  onClick={() => update({ favourites: !filters.favourites })}
                  aria-pressed={filters.favourites}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                    filters.favourites
                      ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400'
                      : 'border-border bg-card text-muted-foreground hover:border-red-300 hover:text-red-500'
                  )}
                >
                  <Heart size={14} className={filters.favourites ? 'fill-current' : ''} />
                  My favourites{localFavourites.size > 0 ? ` (${localFavourites.size})` : ''}
                </button>
              </FilterGroup>
            )}

            <CategoryGroup label="Course" type="course" categories={categories.courses} active={filters.course} onToggle={toggleCategory} />
            <CategoryGroup label="Cuisine" type="cuisine" categories={categories.cuisines} active={filters.cuisine} onToggle={toggleCategory} />
            <CategoryGroup label="Dietary" type="dietary" categories={categories.dietaries} active={filters.dietary} onToggle={toggleCategory} />
          </div>
        </aside>

        {/* ── Results ── */}
        <div className="min-w-0 flex-1">
          {chips.length > 0 && (
            <div className="mb-7 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.remove}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary py-1 pl-3 pr-2 text-sm font-medium text-primary-foreground"
                  aria-label={`Remove filter: ${chip.label}`}
                >
                  {chip.label}
                  <X size={14} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="ml-1 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-display text-2xl">
                {filters.favourites && localFavourites.size === 0 ? 'Your recipe box is empty' : 'No recipes match'}
              </p>
              <p className="mt-2 text-muted-foreground">
                {filters.favourites && localFavourites.size === 0
                  ? 'Tap the heart on any recipe to save it here.'
                  : 'Try removing a filter or searching for something else.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((recipe, i) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  priority={i < 3}
                  sizes="(min-width: 1280px) 25vw, (min-width: 640px) 40vw, 100vw"
                  action={
                    isLoggedIn ? (
                      <FavouriteHeart
                        recipeId={recipe.id}
                        recipeTitle={recipe.title}
                        initialFavourited={localFavourites.has(recipe.id)}
                        favourited={localFavourites.has(recipe.id)}
                        onToggle={() => handleToggleFavourite(recipe.id)}
                      />
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
        active
          ? 'border-primary bg-primary font-medium text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function CategoryGroup({
  label,
  type,
  categories,
  active,
  onToggle,
}: {
  label: string;
  type: CategoryType;
  categories: Category[];
  active: string[];
  onToggle: (type: CategoryType, uid: string) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <FilterGroup label={label}>
      {categories.map((cat) => (
        <Pill key={cat.id} active={active.includes(cat.uid)} onClick={() => onToggle(type, cat.uid)}>
          {cat.title}
        </Pill>
      ))}
    </FilterGroup>
  );
}

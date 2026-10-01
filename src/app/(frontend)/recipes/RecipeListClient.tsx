'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Heart, Search, X } from 'lucide-react';
import { getImageUrl } from '@/lib/recipes';
import type { RecipeSummary, Category } from '@/types/recipe';

const TIME_BUCKETS = [
  { label: 'Under 15 min', value: 15 },
  { label: 'Under 30 min', value: 30 },
  { label: 'Under 60 min', value: 60 },
] as const;

interface RecipeListClientProps {
  initialRecipes: RecipeSummary[];
  categories: {
    courses: Category[];
    cuisines: Category[];
    dietaries: Category[];
  };
  favouriteIds: string[];
  isLoggedIn: boolean;
}

export default function RecipeListClient({
  initialRecipes,
  categories,
  favouriteIds,
  isLoggedIn,
}: RecipeListClientProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({
    course: new Set(),
    cuisine: new Set(),
    dietary: new Set(),
  });
  const [showFavourites, setShowFavourites] = useState(false);
  const [localFavourites, setLocalFavourites] = useState<Set<string>>(() => new Set(favouriteIds));
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const hasFilters =
    activeFilters.course.size > 0 ||
    activeFilters.cuisine.size > 0 ||
    activeFilters.dietary.size > 0 ||
    showFavourites ||
    maxTime !== null ||
    searchQuery.trim().length > 0;

  async function handleToggleFavourite(recipeId: string) {
    const wasFav = localFavourites.has(recipeId);
    // Optimistic update
    setLocalFavourites((prev) => {
      const next = new Set(prev);
      if (wasFav) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });

    try {
      const res = await fetch(`/api/recipe/${recipeId}/favourite`, { method: 'POST' });
      if (!res.ok) {
        // Revert
        setLocalFavourites((prev) => {
          const next = new Set(prev);
          if (wasFav) next.add(recipeId);
          else next.delete(recipeId);
          return next;
        });
      }
    } catch {
      // Revert
      setLocalFavourites((prev) => {
        const next = new Set(prev);
        if (wasFav) next.add(recipeId);
        else next.delete(recipeId);
        return next;
      });
    }
  }

  const filteredRecipes = initialRecipes.filter((recipe) => {
    if (showFavourites && !localFavourites.has(recipe.id)) return false;
    if (activeFilters.course.size > 0 && !recipe.course_categories.some((c) => activeFilters.course.has(c.id))) return false;
    if (activeFilters.cuisine.size > 0 && !recipe.cuisine_categories.some((c) => activeFilters.cuisine.has(c.id))) return false;
    if (activeFilters.dietary.size > 0 && !recipe.dietary_categories.some((c) => activeFilters.dietary.has(c.id))) return false;
    if (maxTime !== null) {
      const total = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
      if (total === 0 || total > maxTime) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (
        !recipe.title.toLowerCase().includes(q) &&
        !recipe.short_description.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  function handleFilter(type: 'course' | 'cuisine' | 'dietary', id: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev[type]);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...prev, [type]: next };
    });
  }

  function clearFilters() {
    setActiveFilters({ course: new Set(), cuisine: new Set(), dietary: new Set() });
    setShowFavourites(false);
    setMaxTime(null);
    setSearchQuery('');
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar filters */}
      <aside className="lg:w-56 flex-shrink-0">
        <div className="lg:sticky lg:top-[4.5rem] space-y-6">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search recipes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Total time filter */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Total Time
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {TIME_BUCKETS.map((bucket) => (
                <button
                  key={bucket.value}
                  onClick={() => setMaxTime(maxTime === bucket.value ? null : bucket.value)}
                  className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
                    maxTime === bucket.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {bucket.label}
                </button>
              ))}
            </div>
          </div>

          {/* Favourites toggle */}
          {isLoggedIn && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Favourites
              </h3>
              <button
                onClick={() => setShowFavourites((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border transition-colors ${
                  showFavourites
                    ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
                    : 'bg-card text-muted-foreground border-border hover:border-red-300 hover:text-red-500'
                }`}
              >
                <Heart size={14} className={showFavourites ? 'fill-current' : ''} />
                My favourites{localFavourites.size > 0 ? ` (${localFavourites.size})` : ''}
              </button>
            </div>
          )}

          <FilterGroup label="Course" categories={categories.courses} activeIds={activeFilters.course} onToggle={(id) => handleFilter('course', id)} />
          <FilterGroup label="Cuisine" categories={categories.cuisines} activeIds={activeFilters.cuisine} onToggle={(id) => handleFilter('cuisine', id)} />
          <FilterGroup label="Dietary" categories={categories.dietaries} activeIds={activeFilters.dietary} onToggle={(id) => handleFilter('dietary', id)} />
          {hasFilters && (
            <div className="pt-2 border-t border-border space-y-1">
              <p className="text-xs text-muted-foreground">
                {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Grid */}
      <div className="flex-1 min-w-0">
        {filteredRecipes.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {showFavourites ? 'No favourited recipes yet.' : 'No recipes found.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavourited={localFavourites.has(recipe.id)}
                isLoggedIn={isLoggedIn}
                onToggleFavourite={handleToggleFavourite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  categories,
  activeIds,
  onToggle,
}: {
  label: string;
  categories: Category[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
              activeIds.has(cat.id)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function RecipeCard({
  recipe,
  isFavourited,
  isLoggedIn,
  onToggleFavourite,
}: {
  recipe: RecipeSummary;
  isFavourited: boolean;
  isLoggedIn: boolean;
  onToggleFavourite: (recipeId: string) => void;
}) {
  const imageUrl = getImageUrl(recipe.feature_image_path);

  return (
    <div className="group relative bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-md hover:border-primary/20 transition-all">
      {/* Card link — covers the whole card */}
      <Link href={`/${recipe.uid}`} className="absolute inset-0 z-10" aria-label={recipe.title} />

      {/* Image */}
      <div className="aspect-[4/3] relative bg-muted overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={recipe.feature_image_alt || recipe.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Clock size={32} />
          </div>
        )}
        {/* Favourite button — sits above the card link */}
        {isLoggedIn && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavourite(recipe.id);
            }}
            className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full bg-white/90 dark:bg-black/60 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              size={16}
              className={isFavourited
                ? 'text-red-500 fill-current'
                : 'text-muted-foreground hover:text-red-500'
              }
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {recipe.title}
        </h3>
        {recipe.short_description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {recipe.short_description}
          </p>
        )}
        {recipe.course_categories.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {recipe.course_categories.map((cat) => (
              <span key={cat.id} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {cat.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

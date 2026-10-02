'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ExternalLink, Shuffle, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/toast/context';
import { getImageUrl } from '@/lib/recipes';
import { addWeeks, formatWeekRange, weekStartOf } from '@/lib/weeks';
import { cn } from '@/utils/cn';
import type { RecipeSummary } from '@/types/recipe';

const WEEKS_BACK = 4;
const WEEKS_AHEAD = 16;

interface ScheduledWeek {
  week_start: string;
  recipe: RecipeSummary;
}

export default function FeaturedSchedulePage() {
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [schedule, setSchedule] = useState<Record<string, RecipeSummary>>({});
  const [thisWeek, setThisWeek] = useState(weekStartOf());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [savingWeek, setSavingWeek] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/featured?back=${WEEKS_BACK}&ahead=${WEEKS_AHEAD}`, { cache: 'no-store' }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))),
      fetch('/api/recipe?limit=100', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([sched, rec]) => {
        if (!sched.ok) throw new Error(sched.j.error || 'Failed to load the schedule');
        setThisWeek(sched.j.thisWeek);
        setSchedule(Object.fromEntries((sched.j.data as ScheduledWeek[]).map((w) => [w.week_start, w.recipe])));
        setRecipes(((rec.data || []) as RecipeSummary[]).sort((a, b) => a.title.localeCompare(b.title)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const weeks = useMemo(
    () => Array.from({ length: WEEKS_BACK + WEEKS_AHEAD + 1 }, (_, i) => addWeeks(thisWeek, i - WEEKS_BACK)),
    [thisWeek]
  );
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const upcoming = weeks.filter((w) => w >= thisWeek);
  const past = weeks.filter((w) => w < thisWeek);
  const unplanned = upcoming.filter((w) => !schedule[w]).length;

  async function setWeek(week: string, recipeId: string) {
    const recipe = byId.get(recipeId);
    if (!recipe) return;
    const before = schedule[week];
    setSchedule((s) => ({ ...s, [week]: recipe })); // optimistic
    setSavingWeek(week);
    try {
      const res = await fetch('/api/admin/featured', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: week, recipe_id: recipeId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      addToast(`${recipe.title} is the recipe for ${formatWeekRange(week)}`, 'success');
    } catch (e) {
      setSchedule((s) => {
        const next = { ...s };
        if (before) next[week] = before;
        else delete next[week];
        return next;
      });
      addToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSavingWeek(null);
    }
  }

  async function clearWeek(week: string) {
    const before = schedule[week];
    setSchedule((s) => {
      const next = { ...s };
      delete next[week];
      return next;
    });
    const res = await fetch(`/api/admin/featured?week=${week}`, { method: 'DELETE' });
    if (!res.ok) {
      setSchedule((s) => ({ ...s, [week]: before }));
      addToast('Failed to clear the week', 'error');
    }
  }

  /** A recipe with a photo that isn't scheduled anywhere in view */
  function suggest(week: string) {
    const used = new Set(Object.values(schedule).map((r) => r.id));
    const pool = recipes.filter((r) => r.feature_image_path && !used.has(r.id));
    const fallback = recipes.filter((r) => r.feature_image_path && r.id !== schedule[week]?.id);
    const options = pool.length ? pool : fallback;
    if (!options.length) return addToast('No recipes with photos to suggest', 'error');
    setWeek(week, options[Math.floor(Math.random() * options.length)].id);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipe of the week</h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            One recipe per week, Monday to Sunday, shown at the top of the homepage. Weeks with nothing planned show the
            newest recipe with a photo.
          </p>
        </div>
        {!loading && !error && (
          <p className={cn('rounded-full px-3 py-1 text-sm font-medium', unplanned ? 'bg-viz-attention/12 text-viz-attention' : 'bg-viz-good/12 text-viz-good')}>
            {unplanned ? `${unplanned} of the next ${upcoming.length} weeks to plan` : 'All weeks planned'}
          </p>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}. If the schedule table is new, run migration 026_featured_schedule.sql in Supabase.
        </p>
      ) : loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
            {upcoming.map((week) => (
              <WeekRow
                key={week}
                week={week}
                isCurrent={week === thisWeek}
                recipe={schedule[week]}
                recipes={recipes}
                saving={savingWeek === week}
                onChoose={(id) => setWeek(week, id)}
                onSuggest={() => suggest(week)}
                onClear={() => clearWeek(week)}
              />
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            aria-expanded={showPast}
          >
            <ChevronDown size={16} className={cn('transition-transform', showPast && 'rotate-180')} />
            {showPast ? 'Hide' : 'Show'} the last {WEEKS_BACK} weeks
          </button>
          {showPast && (
            <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/30">
              {[...past].reverse().map((week) => (
                <li key={week} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span className="tabular-nums text-muted-foreground">{formatWeekRange(week)}</span>
                  <span className="truncate">{schedule[week]?.title ?? <span className="text-muted-foreground">Newest recipe</span>}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function WeekRow({
  week,
  isCurrent,
  recipe,
  recipes,
  saving,
  onChoose,
  onSuggest,
  onClear,
}: {
  week: string;
  isCurrent: boolean;
  recipe?: RecipeSummary;
  recipes: RecipeSummary[];
  saving: boolean;
  onChoose: (id: string) => void;
  onSuggest: () => void;
  onClear: () => void;
}) {
  const img = recipe ? getImageUrl(recipe.feature_image_path) : null;

  return (
    <li className={cn('grid gap-4 px-5 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center', isCurrent && 'bg-brand-muted')}>
      <div>
        <p className="font-medium tabular-nums">{formatWeekRange(week)}</p>
        {isCurrent && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-foreground">
            <Star size={12} className="fill-primary text-primary-foreground" /> This week
          </p>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <span className="relative size-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {img && <Image src={img} alt="" fill sizes="48px" className="object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          <Select value={recipe?.id ?? ''} onValueChange={onChoose} disabled={saving}>
            <SelectTrigger className="w-full" aria-label={`Recipe for ${formatWeekRange(week)}`}>
              <SelectValue placeholder="Not planned: choose a recipe" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {recipes.map((r) => (
                <SelectItem key={r.id} value={r.id} disabled={!r.feature_image_path}>
                  {r.title}
                  {!r.feature_image_path && ' (needs a photo)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onSuggest} disabled={saving} title="Pick a recipe with a photo that isn't already scheduled">
          <Shuffle size={14} /> Suggest
        </Button>
        {recipe && (
          <>
            <Button type="button" variant="ghost" size="sm" asChild title="View on the site">
              <Link href={`/${recipe.uid}`} target="_blank">
                <ExternalLink size={14} />
                <span className="sr-only">View {recipe.title}</span>
              </Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={saving} title="Clear this week">
              <X size={14} />
              <span className="sr-only">Clear {formatWeekRange(week)}</span>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

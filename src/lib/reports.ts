import { fitsSlot, type SlotKind } from '@/lib/mealPicker';
import type { RecipeSummary } from '@/types/recipe';

// ─── Admin reports ───────────────────────────────────────────────────────────
// Pure calculations over raw rows, so they can be tested without a database.

export interface ReportRecipe extends RecipeSummary {
  published_at: string;
  featured_from: string | null;
}

export interface ReportInput {
  recipes: ReportRecipe[];
  favourites: { user_id: string; recipe_id: string; created_at: string }[];
  profiles: { id: string; role: string | null; created_at: string; last_login_at: string | null }[];
  pairings: { recipe_id: string; accompanying_id: string }[];
  /** null when view tracking isn't set up yet (migration 025) */
  views?: { recipe_id: string; user_id: string | null; viewed_at: string }[] | null;
}

export interface Bucket {
  key: string;
  label: string;
  count: number;
}

export interface ViewWeek {
  key: string;
  label: string;
  signedIn: number;
  guests: number;
}

export interface HealthIssue {
  key: string;
  label: string;
  why: string;
  recipes: { id: string; uid: string; title: string }[];
}

export interface Report {
  members: { total: number; members: number; staff: number; new30: number; active30: number; byMonth: Bucket[] };
  saves: {
    total: number;
    last30: number;
    savers: number;
    byWeek: Bucket[];
    top: { recipe: ReportRecipe; count: number }[];
    byCourse: Bucket[];
    byCuisine: Bucket[];
  };
  health: { total: number; complete: number; issues: HealthIssue[] };
  coverage: {
    courses: Bucket[];
    timeBands: Bucket[];
    slots: Record<SlotKind, number>;
    added30: number;
  };
  featured: { current: ReportRecipe | null; upcoming: { recipe: ReportRecipe; from: string }[] };
  views: {
    enabled: boolean;
    last30: number;
    signedIn30: number;
    guests30: number;
    /** distinct signed-in members who viewed a recipe in the last 30 days */
    activeMembers30: number;
    byWeek: ViewWeek[];
    top: { recipe: ReportRecipe; views: number; signedIn: number }[];
  };
}

const DAY = 24 * 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Monday of the week containing `d` (UTC) */
function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}

function countBy<T>(items: T[], keysOf: (item: T) => string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) for (const k of keysOf(item)) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}

const sortDesc = (buckets: Bucket[]) => buckets.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

export function buildReport(input: ReportInput, now: Date = new Date()): Report {
  const { recipes, favourites, profiles, pairings } = input;
  const since30 = now.getTime() - 30 * DAY;
  const byId = new Map(recipes.map((r) => [r.id, r]));

  // ── Members ──
  const isStaff = (role: string | null) => role === 'editor' || role === 'admin' || role === 'super_admin';
  const byMonth: Bucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    byMonth.push({
      key,
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      count: profiles.filter((p) => p.created_at.slice(0, 7) === key).length,
    });
  }

  // ── Saves ──
  const thisWeek = weekStart(now);
  const byWeek: Bucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(thisWeek.getTime() - i * 7 * DAY);
    const end = start.getTime() + 7 * DAY;
    byWeek.push({
      key: iso(start),
      label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      count: favourites.filter((f) => {
        const t = new Date(f.created_at).getTime();
        return t >= start.getTime() && t < end;
      }).length,
    });
  }

  const savesPerRecipe = countBy(favourites, (f) => [f.recipe_id]);
  const top = [...savesPerRecipe.entries()]
    .filter(([id]) => byId.has(id))
    .map(([id, count]) => ({ recipe: byId.get(id)!, count }))
    .sort((a, b) => b.count - a.count || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, 10);

  const savedRecipes = favourites.map((f) => byId.get(f.recipe_id)).filter((r): r is ReportRecipe => !!r);
  const toBuckets = (m: Map<string, number>): Bucket[] => sortDesc([...m].map(([label, count]) => ({ key: label, label, count })));

  // ── Recipe health ──
  const paired = new Set(pairings.flatMap((p) => [p.recipe_id, p.accompanying_id]));
  const checks: { key: string; label: string; why: string; failing: (r: ReportRecipe) => boolean }[] = [
    {
      key: 'photo',
      label: 'No photo',
      why: 'Cards, the homepage and the meal planner lead with photos; these show a placeholder.',
      failing: (r) => !r.feature_image_path,
    },
    {
      key: 'times',
      label: 'No prep or cook time',
      why: 'Left out of the time filters, "How long have you got?" and meal timings.',
      failing: (r) => r.prep_time == null && r.cook_time == null,
    },
    {
      key: 'course',
      label: 'No course',
      why: "Can't appear in course filters, the homepage categories or the meal planner.",
      failing: (r) => r.course_categories.length === 0,
    },
    {
      key: 'cuisine',
      label: 'No cuisine',
      why: 'Missed by cuisine filters and the "keep to one cuisine" meal option.',
      failing: (r) => r.cuisine_categories.length === 0,
    },
    {
      key: 'description',
      label: 'No short description',
      why: 'Shown under the title on featured cards and the recipe page.',
      failing: (r) => !r.short_description?.trim(),
    },
    {
      key: 'pairings',
      label: 'No "goes well with" links',
      why: 'The meal planner pairs dishes using these; recipe pages show nothing to go with them.',
      failing: (r) => !paired.has(r.id),
    },
  ];
  const issues: HealthIssue[] = checks
    .map((c) => ({
      key: c.key,
      label: c.label,
      why: c.why,
      recipes: recipes
        .filter(c.failing)
        .map((r) => ({ id: r.id, uid: r.uid, title: r.title }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .filter((i) => i.recipes.length > 0);
  const complete = recipes.filter((r) => checks.every((c) => !c.failing(r))).length;

  // ── Coverage ──
  const bands: [string, string, (t: number | null) => boolean][] = [
    ['15', 'Under 15 min', (t) => t != null && t > 0 && t <= 15],
    ['30', '15–30 min', (t) => t != null && t > 15 && t <= 30],
    ['45', '30–45 min', (t) => t != null && t > 30 && t <= 45],
    ['60', '45–60 min', (t) => t != null && t > 45 && t <= 60],
    ['60+', 'Over an hour', (t) => t != null && t > 60],
    ['none', 'No time set', (t) => !t],
  ];

  // ── Views ──
  const views = input.views ?? [];
  const views30 = views.filter((v) => new Date(v.viewed_at).getTime() >= since30);
  const viewWeeks: ViewWeek[] = byWeek.map((w) => {
    const start = new Date(`${w.key}T00:00:00Z`).getTime();
    const inWeek = views.filter((v) => {
      const t = new Date(v.viewed_at).getTime();
      return t >= start && t < start + 7 * DAY;
    });
    return { key: w.key, label: w.label, signedIn: inWeek.filter((v) => v.user_id).length, guests: inWeek.filter((v) => !v.user_id).length };
  });
  const perRecipe = new Map<string, { views: number; signedIn: number }>();
  for (const v of views30) {
    const e = perRecipe.get(v.recipe_id) ?? { views: 0, signedIn: 0 };
    e.views += 1;
    if (v.user_id) e.signedIn += 1;
    perRecipe.set(v.recipe_id, e);
  }
  const topViewed = [...perRecipe.entries()]
    .filter(([id]) => byId.has(id))
    .map(([id, e]) => ({ recipe: byId.get(id)!, ...e }))
    .sort((a, b) => b.views - a.views || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, 10);

  // ── Recipe of the week ──
  const today = iso(now);
  const scheduled = recipes
    .filter((r) => r.featured_from && r.feature_image_path)
    .sort((a, b) => (a.featured_from! < b.featured_from! ? -1 : 1));
  const current = [...scheduled].reverse().find((r) => r.featured_from! <= today) ?? null;

  return {
    members: {
      total: profiles.length,
      members: profiles.filter((p) => !isStaff(p.role)).length,
      staff: profiles.filter((p) => isStaff(p.role)).length,
      new30: profiles.filter((p) => new Date(p.created_at).getTime() >= since30).length,
      active30: profiles.filter((p) => p.last_login_at && new Date(p.last_login_at).getTime() >= since30).length,
      byMonth,
    },
    saves: {
      total: favourites.length,
      last30: favourites.filter((f) => new Date(f.created_at).getTime() >= since30).length,
      savers: new Set(favourites.map((f) => f.user_id)).size,
      byWeek,
      top,
      byCourse: toBuckets(countBy(savedRecipes, (r) => r.course_categories.map((c) => c.title))),
      byCuisine: toBuckets(countBy(savedRecipes, (r) => r.cuisine_categories.map((c) => c.title))),
    },
    health: { total: recipes.length, complete, issues },
    coverage: {
      courses: toBuckets(countBy(recipes, (r) => r.course_categories.map((c) => c.title))),
      timeBands: bands.map(([key, label, test]) => ({ key, label, count: recipes.filter((r) => test(r.total_time)).length })),
      slots: {
        starter: recipes.filter((r) => fitsSlot(r, 'starter')).length,
        main: recipes.filter((r) => fitsSlot(r, 'main')).length,
        side: recipes.filter((r) => fitsSlot(r, 'side')).length,
        dessert: recipes.filter((r) => fitsSlot(r, 'dessert')).length,
      },
      added30: recipes.filter((r) => new Date(r.published_at).getTime() >= since30).length,
    },
    featured: {
      current,
      upcoming: scheduled.filter((r) => r.featured_from! > today).map((r) => ({ recipe: r, from: r.featured_from! })),
    },
    views: {
      enabled: input.views != null,
      last30: views30.length,
      signedIn30: views30.filter((v) => v.user_id).length,
      guests30: views30.filter((v) => !v.user_id).length,
      activeMembers30: new Set(views30.map((v) => v.user_id).filter(Boolean)).size,
      byWeek: viewWeeks,
      top: topViewed,
    },
  };
}

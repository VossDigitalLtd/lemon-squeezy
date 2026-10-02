import { describe, it, expect } from 'vitest';
import { buildReport, type ReportRecipe, type ReportInput } from '@/lib/reports';
import type { Category } from '@/types/recipe';

const cat = (type: Category['type'], uid: string): Category => ({ id: `${type}-${uid}`, type, uid, title: uid[0].toUpperCase() + uid.slice(1) });

function recipe(id: string, o: Partial<ReportRecipe> & { course?: string; cuisine?: string } = {}): ReportRecipe {
  const { course, cuisine, ...rest } = o;
  return {
    id,
    uid: id,
    title: id,
    subtitle: '',
    short_description: 'Tasty',
    feature_image_path: `${id}.jpg`,
    feature_image_alt: null,
    prep_time: 10,
    cook_time: 10,
    total_time: 20,
    course_categories: course ? [cat('course', course)] : [cat('course', 'main')],
    cuisine_categories: cuisine ? [cat('cuisine', cuisine)] : [cat('cuisine', 'greek')],
    dietary_categories: [],
    published_at: '2026-01-01T00:00:00Z',
    featured_from: null,
    ...rest,
  };
}

const now = new Date('2026-10-02T12:00:00Z'); // a Friday

const input: ReportInput = {
  recipes: [
    recipe('pie', { course: 'main' }),
    recipe('houmous', { course: 'meze', total_time: 10, published_at: '2026-09-20T00:00:00Z' }),
    recipe('fudge', { course: 'dessert', feature_image_path: null, prep_time: null, cook_time: null, total_time: null, short_description: '' }),
    recipe('mystery', { course_categories: [], cuisine_categories: [] }),
  ],
  favourites: [
    { user_id: 'a', recipe_id: 'houmous', created_at: '2026-09-30T09:00:00Z' }, // this week
    { user_id: 'b', recipe_id: 'houmous', created_at: '2026-09-25T09:00:00Z' }, // last week
    { user_id: 'a', recipe_id: 'pie', created_at: '2026-06-01T09:00:00Z' }, // outside 30 days
    { user_id: 'a', recipe_id: 'deleted', created_at: '2026-09-29T09:00:00Z' }, // recipe gone
  ],
  profiles: [
    { id: 'a', role: 'super_admin', created_at: '2026-01-10T00:00:00Z', last_login_at: '2026-10-01T00:00:00Z' },
    { id: 'b', role: 'user', created_at: '2026-09-15T00:00:00Z', last_login_at: '2026-08-01T00:00:00Z' },
    { id: 'c', role: null, created_at: '2026-10-01T00:00:00Z', last_login_at: null },
  ],
  pairings: [{ recipe_id: 'pie', accompanying_id: 'houmous' }],
};

const report = buildReport(input, now);

describe('buildReport: members', () => {
  it('splits members from staff and counts recent activity', () => {
    expect(report.members).toMatchObject({ total: 3, members: 2, staff: 1, new30: 2, active30: 1 });
  });

  it('buckets sign-ups by month, ending with the current month', () => {
    expect(report.members.byMonth).toHaveLength(12);
    expect(report.members.byMonth.at(-1)).toMatchObject({ key: '2026-10', count: 1 });
    expect(report.members.byMonth.at(-2)).toMatchObject({ key: '2026-09', count: 1 });
  });
});

describe('buildReport: saves', () => {
  it('counts totals, the last 30 days and distinct savers', () => {
    expect(report.saves).toMatchObject({ total: 4, last30: 3, savers: 2 });
  });

  it('buckets by Monday-starting week', () => {
    expect(report.saves.byWeek.at(-1)).toMatchObject({ key: '2026-09-28', count: 2 });
    expect(report.saves.byWeek.at(-2)).toMatchObject({ key: '2026-09-21', count: 1 });
  });

  it('ranks the most saved recipes and ignores deleted ones', () => {
    expect(report.saves.top.map((t) => [t.recipe.id, t.count])).toEqual([['houmous', 2], ['pie', 1]]);
    expect(report.saves.byCourse[0]).toMatchObject({ label: 'Meze', count: 2 });
  });
});

describe('buildReport: recipe health', () => {
  const issue = (key: string) => report.health.issues.find((i) => i.key === key)?.recipes.map((r) => r.id);

  it('lists recipes missing each piece', () => {
    expect(issue('photo')).toEqual(['fudge']);
    expect(issue('times')).toEqual(['fudge']);
    expect(issue('course')).toEqual(['mystery']);
    expect(issue('description')).toEqual(['fudge']);
    expect(issue('pairings')).toEqual(['fudge', 'mystery']);
  });

  it('counts fully complete recipes', () => {
    expect(report.health).toMatchObject({ total: 4, complete: 2 });
  });
});

describe('buildReport: coverage and featuring', () => {
  it('counts what the meal planner can use and time bands', () => {
    expect(report.coverage.slots).toEqual({ starter: 1, main: 1, side: 0, dessert: 1 });
    expect(report.coverage.timeBands.find((b) => b.key === 'none')?.count).toBe(1);
    expect(report.coverage.added30).toBe(1);
  });

  it('finds the current and upcoming recipe of the week', () => {
    const r = buildReport(
      {
        ...input,
        recipes: [
          recipe('old', { featured_from: '2026-09-01' }),
          recipe('now', { featured_from: '2026-09-28' }),
          recipe('next', { featured_from: '2026-10-05' }),
          recipe('nophoto', { featured_from: '2026-10-12', feature_image_path: null }),
        ],
      },
      now
    );
    expect(r.featured.current?.id).toBe('now');
    expect(r.featured.upcoming.map((u) => u.recipe.id)).toEqual(['next']);
  });
});

describe('buildReport: views', () => {
  const withViews = buildReport(
    {
      ...input,
      views: [
        { recipe_id: 'houmous', user_id: 'a', viewed_at: '2026-10-01T10:00:00Z' },
        { recipe_id: 'houmous', user_id: null, viewed_at: '2026-10-01T11:00:00Z' },
        { recipe_id: 'houmous', user_id: 'b', viewed_at: '2026-09-22T11:00:00Z' },
        { recipe_id: 'pie', user_id: 'a', viewed_at: '2026-09-30T10:00:00Z' },
        { recipe_id: 'pie', user_id: null, viewed_at: '2026-07-01T10:00:00Z' }, // older than 30 days
      ],
    },
    now
  );

  it('splits members from guests and counts active members', () => {
    expect(withViews.views).toMatchObject({ enabled: true, last30: 4, signedIn30: 3, guests30: 1, activeMembers30: 2 });
  });

  it('stacks signed-in and guest views per week', () => {
    expect(withViews.views.byWeek.at(-1)).toMatchObject({ key: '2026-09-28', signedIn: 2, guests: 1 });
    expect(withViews.views.byWeek.at(-2)).toMatchObject({ key: '2026-09-21', signedIn: 1, guests: 0 });
  });

  it('ranks the most viewed recipes in the last 30 days', () => {
    expect(withViews.views.top.map((t) => [t.recipe.id, t.views, t.signedIn])).toEqual([['houmous', 3, 2], ['pie', 1, 1]]);
  });

  it('reports tracking as off when there is no views table', () => {
    expect(report.views.enabled).toBe(false);
  });
});

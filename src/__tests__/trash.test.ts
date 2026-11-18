import { describe, it, expect } from 'vitest';
import { daysLeft, TRASH_DAYS } from '@/lib/trash';
import { toRecipe, toRecipeSummary, type RawRecipeRow } from '@/lib/supabase/services/RecipeService';

const DAY = 24 * 60 * 60 * 1000;

describe('daysLeft', () => {
  const now = new Date('2026-10-29T12:00:00Z');

  it('counts down from the trash period', () => {
    expect(daysLeft(now.toISOString(), now)).toBe(TRASH_DAYS);
    expect(daysLeft(new Date(now.getTime() - 3 * DAY).toISOString(), now)).toBe(TRASH_DAYS - 3);
  });

  it('rounds part days up and never goes below 0', () => {
    expect(daysLeft(new Date(now.getTime() - (TRASH_DAYS - 0.5) * DAY).toISOString(), now)).toBe(1);
    expect(daysLeft(new Date(now.getTime() - (TRASH_DAYS + 2) * DAY).toISOString(), now)).toBe(0);
  });
});

function row(id: string, o: Partial<RawRecipeRow> = {}): RawRecipeRow {
  return {
    id,
    uid: id,
    title: id,
    short_description: '',
    feature_image_path: null,
    feature_image_alt: null,
    recipe_categories: [],
    ...o,
  };
}

const course = (id: string, deleted_at: string | null = null) => ({ category: { id, type: 'course' as const, uid: id, title: id, deleted_at } });

describe('trashed items drop out of recipes', () => {
  it('leaves out categories in the trash, whether hidden (null) or seen by the service role', () => {
    const r = toRecipeSummary(
      row('soup', { recipe_categories: [course('mains'), course('starters', '2026-10-01T00:00:00Z'), { category: null }] })
    );
    expect(r.course_categories.map((c) => c.id)).toEqual(['mains']);
    expect(r.course_categories[0]).not.toHaveProperty('deleted_at');
  });

  it('leaves out accompanying recipes in the trash', () => {
    const r = toRecipe(
      row('meatballs', {
        recipe_accompanying: [
          { accompanying: row('tzatziki') },
          { accompanying: row('houmous', { deleted_at: '2026-10-01T00:00:00Z' }) },
          { accompanying: null },
        ],
      })
    );
    expect(r.accompanying_recipes.map((a) => a.id)).toEqual(['tzatziki']);
  });
});

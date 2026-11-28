import { describe, it, expect } from 'vitest';
import { applyChanges, toIngredientGroups } from '@/lib/mcp/recipeTools';
import type { RecipeFormData } from '@/types/recipe';
import { categoryLabel } from '@/lib/recipes';

const recipe: RecipeFormData = {
  uid: 'chorizo-soup',
  title: 'Chorizo Soup',
  subtitle: '',
  short_description: 'Smoky soup',
  full_description: '',
  prep_time: 10,
  cook_time: 45,
  servings: 4,
  calories_per_serving: null,
  rest_periods: [],
  ingredient_groups: [
    {
      group_title: '',
      items: [
        { quantity: 1, unit: null, name: 'chicken stock cube', ingredient_id: 'stock-id' },
        { quantity: 25, unit: 'g', name: 'Fresh basil', ingredient_id: 'basil-id' },
      ],
    },
  ],
  method_groups: [{ group_title: '', items: ['Roast the vegetables.', 'Blitz.'] }],
  method_links: { phrases: [{ phrase: 'Add 500ml of chicken stock', ingredient_ids: ['stock-id'] }], not_in_method: [] },
  serving_suggestions: '',
  tips: '',
  inspiration: '',
  course_category_ids: ['main'],
  cuisine_category_ids: [],
  dietary_category_ids: [],
  accompanying_recipe_ids: ['bread'],
};

describe('changes from the connector', () => {
  it('keeps library links for unchanged ingredient names, and adds new lines unlinked', () => {
    const groups = toIngredientGroups(
      [{ group_title: ' ', items: [{ quantity: 1, unit: null, name: 'Chicken stock cube' }, { quantity: 8, unit: 'leaf', name: 'sage', note: ' torn ' }]}],
      recipe.ingredient_groups
    );
    expect(groups).toEqual([
      {
        group_title: '',
        items: [
          { quantity: 1, unit: null, name: 'Chicken stock cube', ingredient_id: 'stock-id' },
          { quantity: 8, unit: 'leaf', name: 'sage', note: 'torn' },
        ],
      },
    ]);
  });

  it('changes only what was sent, keeping the rest (method links, categories, pairings)', async () => {
    const next = await applyChanges(recipe, { tips: '  Freezes well. ', servings: 6, method_groups: [{ group_title: '', steps: ['Roast.', ' Blitz well. '] }] });
    expect(next).toEqual({
      ...recipe,
      tips: 'Freezes well.',
      servings: 6,
      method_groups: [{ group_title: '', items: ['Roast.', 'Blitz well.'] }],
    });
  });

  it('sets rest times before or after cooking, keeping a label only for "other"', async () => {
    const next = await applyChanges(recipe, {
      rest_periods: [
        { type: 'marinate', minutes: 120, when: 'before' },
        { type: 'rest', label: 'ignored', minutes: 10, when: 'after' },
        { type: 'other', label: ' Freezing ', minutes: 60, when: 'after' },
      ],
    });
    expect(next).toEqual({
      ...recipe,
      rest_periods: [
        { type: 'marinate', minutes: 120, when: 'before' },
        { type: 'rest', minutes: 10, when: 'after' },
        { type: 'other', label: 'Freezing', minutes: 60, when: 'after' },
      ],
    });
    expect(await applyChanges(recipe, { rest_periods: [] })).toEqual({ ...recipe, rest_periods: [] });
  });

  it('refuses to blank the title', async () => {
    expect(await applyChanges(recipe, { title: '   ' })).toEqual({ error: 'A recipe needs a title' });
  });
});

describe('category names on recipe pages', () => {
  it('uses the page label when there is one, otherwise the name', () => {
    expect(categoryLabel({ title: 'Cypriot', page_label: 'From a Cypriot kitchen' })).toBe('From a Cypriot kitchen');
    expect(categoryLabel({ title: 'Greek', page_label: null })).toBe('Greek');
    expect(categoryLabel({ title: 'Greek', page_label: '  ' })).toBe('Greek');
    expect(categoryLabel({ title: 'Greek' })).toBe('Greek');
  });
});

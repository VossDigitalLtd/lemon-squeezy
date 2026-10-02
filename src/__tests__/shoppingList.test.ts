import { describe, it, expect } from 'vitest';
import { combineIngredients, formatLine, ingredientKey, listAsText, type ListRecipe } from '@/lib/shoppingList';

const recipe = (id: string, servings: number, items: ListRecipe['ingredient_groups'][number]['items']): ListRecipe => ({
  id,
  uid: id,
  title: id[0].toUpperCase() + id.slice(1),
  servings,
  ingredient_groups: [{ group_title: '', items }],
});

const potatoes = recipe('potatoes', 4, [
  { quantity: 1, unit: 'kg', name: 'Maris Piper potatoes' },
  { quantity: 150, unit: 'ml', name: 'olive oil' },
  { quantity: 3, unit: 'tsp', name: 'Very Lazy Garlic' },
  { quantity: null, unit: null, name: 'Salt and pepper' },
  { quantity: 1, unit: null, name: 'large lemon' },
]);
const salad = recipe('salad', 2, [
  { quantity: 500, unit: 'g', name: 'maris piper potatoes' },
  { quantity: 2, unit: 'tbsp', name: 'olive oil' },
  { quantity: 1, unit: 'tsp', name: 'very lazy garlic' },
  { quantity: null, unit: null, name: 'salt and pepper' },
  { quantity: 2, unit: null, name: 'large lemons' },
  { quantity: 2, unit: 'clove', name: 'garlic' },
]);

describe('ingredientKey', () => {
  it('matches case, spacing and simple plurals', () => {
    expect(ingredientKey('Large Lemons')).toBe(ingredientKey('large lemon'));
    expect(ingredientKey('  red  onions, ')).toBe(ingredientKey('red onion'));
  });
});

describe('combineIngredients', () => {
  const lines = combineIngredients([
    { recipe: potatoes, servings: 4 },
    { recipe: salad, servings: 2 },
  ]);
  const line = (start: string) => lines.filter((l) => l.name.toLowerCase().startsWith(start));

  it('adds weights together across recipes and units', () => {
    const [p] = line('maris');
    expect(p.ingredient).toMatchObject({ quantity: 1500, unit: 'g' });
    expect(p.recipes).toEqual(['Potatoes', 'Salad']);
    expect(formatLine(p, 'metric').amount).toBe('1½ kg');
  });

  it('keeps spoons as spoons and volumes as volumes', () => {
    const oil = line('olive oil');
    expect(oil.map((l) => l.ingredient.unit).sort()).toEqual(['ml', 'tbsp']);
    const [garlic] = line('very lazy');
    expect(garlic.ingredient).toMatchObject({ quantity: 4, unit: 'tsp' });
  });

  it('adds counts, keeps different count units apart and lists "to taste" once', () => {
    expect(line('large lemon')[0].ingredient).toMatchObject({ quantity: 3, unit: null });
    expect(line('garlic')[0].ingredient).toMatchObject({ quantity: 2, unit: 'clove' });
    expect(line('salt')).toHaveLength(1);
    expect(line('salt')[0].ingredient.quantity).toBeNull();
  });

  it('scales to the servings on the list', () => {
    const [p] = combineIngredients([{ recipe: potatoes, servings: 2 }]).filter((l) => l.name.startsWith('Maris'));
    expect(p.ingredient.quantity).toBe(500);
  });

  it('turns three teaspoons into a tablespoon', () => {
    const [g] = combineIngredients([{ recipe: potatoes, servings: 4 }]).filter((l) => l.name.startsWith('Very'));
    expect(g.ingredient).toMatchObject({ quantity: 1, unit: 'tbsp' });
  });

  it('writes a plain-text list without ticked lines', () => {
    const text = listAsText(lines, [{ text: 'Foil', checked: false }], new Set([line('salt')[0].key]), 'metric');
    expect(text).toContain('- 1½ kg Maris Piper potatoes');
    expect(text).toContain('- Foil');
    expect(text).not.toContain('Salt');
  });
});

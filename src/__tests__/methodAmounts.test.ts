import { describe, it, expect } from 'vitest';
import { findStepAmounts, scaleStepAmounts } from '@/lib/methodAmounts';

const at = (step: string, servings: number, system: 'metric' | 'imperial' = 'metric', base = 4) =>
  scaleStepAmounts(step, base, servings, system);

describe('scaleStepAmounts', () => {
  const soup = 'Pour the vegetables into a large saucepan. Add 500ml of chicken stock, a large handful of basil leaves and red wine vinegar.';

  it('leaves steps exactly as written at the recipe servings in metric', () => {
    expect(at(soup, 4)).toBe(soup);
    expect(at('Save about 1/4 cup of the starchy water', 4)).toBe('Save about 1/4 cup of the starchy water');
  });

  it('scales with servings, keeping the stock in step with the cubes', () => {
    expect(at(soup, 2)).toContain('Add 250ml of chicken stock');
    expect(at(soup, 6)).toContain('Add 750ml of chicken stock');
    expect(at(soup, 8)).toContain('Add 1 l of chicken stock');
    expect(at(soup, 8)).toContain('a large handful of basil'); // words don't scale
  });

  it('converts to imperial', () => {
    expect(at(soup, 4, 'imperial')).toContain('Add 17 fl oz of chicken stock');
    expect(at('Cream 140g softened butter and 140g caster sugar', 4, 'imperial')).toBe('Cream 5 oz softened butter and 5 oz caster sugar');
  });

  it('keeps spoons as spoons, spelled out or abbreviated as written', () => {
    expect(at('add 2 tablespoons of olive oil', 8)).toBe('add 4 tablespoons of olive oil');
    expect(at('add 2 tablespoons of olive oil', 2)).toBe('add 1 tablespoon of olive oil');
    expect(at('Heat 1 tbsp oil in a large pan', 2)).toBe('Heat ½ tbsp oil in a large pan');
    expect(at('½ tsp salt and ¼ tsp black pepper', 8)).toBe('1 tsp salt and ½ tsp black pepper');
    expect(at('the inside with 1/2 tsp of five spice', 8)).toBe('the inside with 1 tsp of five spice');
    expect(at('Heat 1 tbsp oil', 4, 'imperial')).toBe('Heat 1 tbsp oil');
    expect(at('Save about 1/4 cup of the water', 4, 'imperial')).toBe('Save about ¼ cup of the water');
    expect(at('add 2 tablespoons of olive oil', 1)).toBe('add ½ tablespoon of olive oil');
  });

  it('scales both ends of a range', () => {
    expect(at('you can use 1-2 tablespoon of oil', 8)).toBe('you can use 2-4 tablespoons of oil');
    expect(at('add 2 to 3 tbsp water', 8)).toBe('add 4 to 6 tbsp water');
  });

  it('steps up and down units like the ingredient list', () => {
    expect(at('450g peeled and chopped carrots and 1.2l vegetable stock', 8)).toBe('900g peeled and chopped carrots and 2.4l vegetable stock');
    expect(at('Add 600g flour', 8)).toBe('Add 1.2 kg flour');
  });

  it('leaves temperatures, times, sizes, counts and per-item sizes alone', () => {
    const untouched = [
      'Preheat oven to 180°C',
      'roast for 30 minutes, then 5-8 minutes more',
      'Line a 20cm tin',
      'cut into 4 pieces with 2 cloves of garlic',
      'shape the mixture (we usually have 40g per meatball)',
      'Use 15g each',
      'a heaped tablespoon of rosemary',
      'Add 3 large eggs and 1 lemon',
    ];
    for (const step of untouched) expect(at(step, 8)).toBe(step);
  });
});

describe('findStepAmounts', () => {
  it('lists what will scale and flags sizes per item', () => {
    expect(findStepAmounts('Boil 500ml water, add 1-2 tbsp oil, 40g per meatball')).toEqual([
      { text: '500ml', perItem: false },
      { text: '1-2 tbsp', perItem: false },
      { text: '40g', perItem: true },
    ]);
  });
});

import { describe, it, expect } from 'vitest';
import { cleanMethodLinks, linkStep, methodCheck, methodTerms } from '@/lib/methodLinks';
import type { IngredientGroup } from '@/types/recipe';

const line = (name: string, ingredient_id: string, quantity: number | null = null) => ({ name, ingredient_id, quantity, unit: null });
const groups = (...items: ReturnType<typeof line>[]): IngredientGroup[] => [{ group_title: '', items }];

/** The linked words in a step, as "word→id" */
const links = (text: string, g: IngredientGroup[], phrases: { phrase: string; ingredient_ids: string[] }[] = []) =>
  linkStep(text, methodTerms(g), { phrases, not_in_method: [] })
    .filter((p) => p.ingredientIds)
    .map((p) => `${p.text}→${p.ingredientIds!.join('+')}`);

describe('linkStep', () => {
  const nachos = groups(
    line('chicken breasts', 'chicken', 3),
    line('paprika', 'paprika', 4),
    line('olive oil', 'oil'),
    line('onion', 'onion', 1),
    line('bell peppers', 'peppers', 3),
    line('lime or lemon', 'lime', 1)
  );

  it('links full names, plurals and a single word of the name', () => {
    expect(links('Season the chicken breasts with the paprika.', nachos)).toEqual(['chicken breasts→chicken', 'paprika→paprika']);
    expect(links('Cook the chicken until golden.', nachos)).toEqual(['chicken→chicken']);
    expect(links('Add the sliced onions and bell peppers.', nachos)).toEqual(['onions→onion', 'bell peppers→peppers']);
    expect(links('Heat 1 tablespoon of olive oil, then the rest of the oil.', nachos)).toEqual(['olive oil→oil', 'oil→oil']);
    expect(links('Pour the lime or lemon juice over.', nachos)).toEqual(['lime or lemon→lime']);
  });

  it('keeps the rest of the step as it was written', () => {
    const parts = linkStep('Fry the Onion gently.', methodTerms(nachos));
    expect(parts.map((p) => p.text).join('')).toBe('Fry the Onion gently.');
    expect(parts).toHaveLength(3);
  });

  it('prefers the full name over a shared word', () => {
    const g = groups(line('salt', 'salt'), line('salt and pepper', 'sp'), line('red pepper', 'red'));
    expect(links('Add the salt.', g)).toEqual(['salt→salt']);
    expect(links('Season with salt and pepper.', g)).toEqual(['salt and pepper→sp']);
    expect(links('Slice the red pepper.', g)).toEqual(['red pepper→red']);
  });

  it('leaves a word that could be two ingredients unlinked', () => {
    const g = groups(line('black pepper', 'black'), line('red pepper', 'red'));
    expect(links('Add the pepper.', g)).toEqual([]);
  });

  it('ignores describing and general words', () => {
    const g = groups(line('soy sauce', 'soy'), line('ground cumin', 'cumin'), line('tomato paste', 'paste'));
    expect(links('Pour over the sauce. Add the ground almonds. Make a paste.', g)).toEqual([]);
    expect(links('Add the cumin and soy sauce.', g)).toEqual(['cumin→cumin', 'soy sauce→soy']);
  });

  it("doesn't read the chicken in chicken stock as the stock", () => {
    const g = groups(line('chicken thighs', 'thigh'), line('chicken stock', 'stock'), line('garlic', 'garlic'), line('garlic granules', 'granules'));
    expect(links('Brown the chicken, add the garlic, then the stock and garlic granules.', g)).toEqual([
      'chicken→thigh',
      'garlic→garlic',
      'stock→stock',
      'garlic granules→granules',
    ]);
  });

  it('matches accents and hyphens either way', () => {
    const g = groups(line('crème fraîche', 'cf'), line('flat-leaf parsley', 'parsley'));
    expect(links('Stir in the creme fraiche and flat leaf parsley.', g)).toEqual(['creme fraiche→cf', 'flat leaf parsley→parsley']);
  });

  it('applies corrections first', () => {
    const g = groups(line('paprika', 'paprika'), line('cumin', 'cumin'), line('onion', 'onion'), line('black pepper', 'black'), line('red pepper', 'red'));
    const phrases = [
      { phrase: 'the spices', ingredient_ids: ['paprika', 'cumin'] },
      { phrase: 'onion mixture', ingredient_ids: [] },
      { phrase: 'pepper', ingredient_ids: ['black'] },
    ];
    expect(links('Add the spices to the onion mixture, then the onion.', g, phrases)).toEqual(['the spices→paprika+cumin', 'onion→onion']);
    expect(links('Season with pepper. Slice the red pepper.', g, phrases)).toEqual(['pepper→black', 'red pepper→red']);
  });
});

describe('methodCheck', () => {
  const g = groups(line('paprika', 'paprika'), line('cumin', 'cumin'), line('salt', 'salt'), line('black pepper', 'black'), line('red pepper', 'red'));
  const method = [{ group_title: '', items: ['Mix the paprika with the pepper.', 'Add the red pepper.'] }];

  it('lists what the method never mentions and words that could be two things', () => {
    const check = methodCheck(g, method);
    expect(check.unmentioned).toEqual(['cumin', 'salt', 'black']);
    expect(check.ambiguous).toEqual([{ word: 'pepper', ingredientIds: ['black', 'red'] }]);
    expect(check).toMatchObject({ mentioned: 2, total: 5 });
  });

  it('takes corrections and "not in the method" into account', () => {
    const check = methodCheck(g, method, { phrases: [{ phrase: 'pepper', ingredient_ids: ['black'] }], not_in_method: ['salt'] });
    expect(check.unmentioned).toEqual(['cumin']);
    expect(check.ambiguous).toEqual([]);
  });
});

describe('cleanMethodLinks', () => {
  it('trims, drops blanks and duplicates', () => {
    expect(
      cleanMethodLinks({
        phrases: [{ phrase: '  the  spices ', ingredient_ids: ['a', 'a', 3] }, { phrase: '' }, { phrase: 'The spices', ingredient_ids: ['b'] }],
        not_in_method: ['x', 'x'],
      })
    ).toEqual({ phrases: [{ phrase: 'The spices', ingredient_ids: ['b'] }], not_in_method: ['x'] });
    expect(cleanMethodLinks(null)).toEqual({ phrases: [], not_in_method: [] });
  });
});

import { describe, it, expect } from 'vitest';
import { parseIngredientName, singular, guessAisle, isStaple, displayName, slugify } from '@/lib/ingredientMatch';

describe('parseIngredientName', () => {
  it.each([
    ['chicken breast, diced', 'chicken breast', 'chicken breast', 'diced', null],
    ['chicken breasts thinly sliced', 'chicken breast', 'chicken breasts', 'thinly sliced', null],
    ['chicken breasts', 'chicken breast', 'chicken breasts', '', null],
    ['-8 bone-in skin-on chicken thighs', 'chicken thigh', 'chicken thighs', 'bone-in skin-on', 8],
    ['8 chicken thighs bone-in and skin on', 'chicken thigh', 'chicken thighs', 'bone-in, skin on', 8],
    ['chicken thighs (skin on, bone in)', 'chicken thigh', 'chicken thighs', 'skin on, bone in', null],
    ['-3 chopped ripe tomatoes', 'tomato', 'tomatoes', 'chopped ripe', 3],
    ['can chopped tomatoes', 'tomato', 'tomatoes', 'chopped', null],
    ['Juice of half a lemon', 'lemon', 'lemon', 'juice', 0.5],
    ['Juice of 1 large lemon', 'lemon', 'lemon', 'juice, large', 1],
    ['Juice of 1-2 lemons', 'lemon', 'lemons', 'juice', 2],
    ['Zest of 1 lemon', 'lemon', 'lemon', 'zest', 1],
    ['A squeeze of lemon juice', 'lemon juice', 'lemon juice', 'juice', null],
    ['chicken stock, made with 1 stock cube', 'chicken stock', 'chicken stock', 'made with 1 stock cube', null],
    ['Thinly sliced spring onion', 'spring onion', 'spring onion', 'thinly sliced', null],
    ['Very Lazy Garlic', 'very lazy garlic', 'very lazy garlic', '', null],
    ['Salt & pepper', 'salt and pepper', 'salt and pepper', '', null],
    ['x 397g condensed milk', 'condensed milk', 'condensed milk', '', null],
    ['Olive oil for roasting', 'olive oil', 'olive oil', 'for roasting', null],
    ['maris piper potatoes cut into 2cm chunks', 'maris piper potato', 'maris piper potatoes', 'cut into 2cm chunks', null],
    ['vegetable stock cube made up with 350ml boiling water', 'vegetable stock cube', 'vegetable stock cube', 'made up with 350ml boiling water', null],
    ['very ripe bananas', 'banana', 'bananas', 'very ripe', null],
    ['Tomato purée', 'tomato puree', 'tomato purée', '', null],
    ['garlic cloves, crushed', 'garlic', 'garlic cloves', 'crushed', null],
  ])('"%s" → %s', (raw, core, name, note, quantity) => {
    expect(parseIngredientName(raw)).toEqual({ core, name, note, quantity });
  });
});

it('keeps a measure written into the name as the unit', () => {
  expect(parseIngredientName('1tsp Dijon mustard')).toEqual({ core: 'dijon mustard', name: 'dijon mustard', note: '', quantity: 1, unit: 'tsp' });
  expect(parseIngredientName('Tbsp olive oil')).toEqual({ core: 'olive oil', name: 'olive oil', note: '', quantity: null, unit: 'tbsp' });
  expect(parseIngredientName('-2 tbsp honey')).toMatchObject({ core: 'honey', quantity: 2, unit: 'tbsp' });
  expect(parseIngredientName('2 heaped tbsp plain flour')).toMatchObject({ core: 'plain flour', quantity: 2, unit: 'tbsp' });
  expect(parseIngredientName('cups of greek yoghurt')).toMatchObject({ core: 'greek yoghurt', quantity: null, unit: 'cup' });
  expect(parseIngredientName('lemons')).not.toHaveProperty('unit');
});

it('handles packs, multipliers, alternatives and buying details', () => {
  expect(parseIngredientName('Juice of a 1/4 lemon')).toMatchObject({ core: 'lemon', quantity: 0.25, note: 'juice' });
  expect(parseIngredientName('x 15g pack fresh oregano, leaves finely chopped')).toMatchObject({ core: 'oregano' });
  expect(parseIngredientName('x 4 pack of Crunchie bars (128g per pack)')).toMatchObject({ core: 'crunchie bar', quantity: 4 });
  expect(parseIngredientName('unwaxed lemons, zest of both')).toMatchObject({ core: 'lemon' });
  expect(parseIngredientName('Juice of 1 lime or lemon')).toMatchObject({ core: 'lime', name: 'lime or lemon', quantity: 1, note: 'juice' });
  expect(parseIngredientName('Zest of 1 orange or clementine')).toMatchObject({ core: 'orange', note: 'zest' });
});

it('reads the wording found in the first library build', () => {
  const core = (raw: string) => parseIngredientName(raw).core;
  expect(parseIngredientName('good pinch chilli flakes')).toMatchObject({ core: 'chilli flake', name: 'chilli flakes', note: 'a good pinch' });
  expect(parseIngredientName('Small handful of flat-leaf parsley chopped')).toMatchObject({ note: 'chopped, a small handful' });
  expect(core('Large pinch of chilli flakes')).toBe('chilli flake');
  expect(core('A sprinkling of smoked paprika')).toBe('smoked paprika');
  expect(core('large splash Worcestershire sauce')).toBe('worcestershire sauce');
  expect(core('Small handful of flat-leaf parsley chopped')).toBe('flat-leaf parsley');
  expect(core('Salt & pepper to season')).toBe('salt and pepper');
  expect(parseIngredientName('maltesers crushed but leave some whole')).toMatchObject({ core: 'maltesers', note: 'crushed, but leave some whole' });
  expect(core('bag of Doritos')).toBe('doritos');
  expect(core('bay leaves')).toBe('bay leaf');
  expect(core('-2 whole red chillies deseeded and sliced')).toBe('red chilli');
  expect(core('330ml can of coke')).toBe('coke');
  expect(core('frozen boiled peas')).toBe('frozen pea');
  expect(parseIngredientName('streaky or back bacon rashers')).toMatchObject({ core: 'streaky bacon', name: 'streaky or back bacon', note: 'rashers' });
  expect(core('vegetable or chicken stock')).toBe('vegetable stock');
  expect(core('goose or duck fat')).toBe('goose fat');
  expect(parseIngredientName('a large onion')).toMatchObject({ core: 'onion', quantity: 1 });
});

it('guesses aisles for the entries that landed in Other', () => {
  expect(guessAisle('asparagus')).toBe('fruit-veg');
  expect(guessAisle('macaroni')).toBe('cupboard');
  expect(guessAisle('cayenne')).toBe('herbs-spices');
  expect(guessAisle('manchego')).toBe('dairy-eggs');
  expect(guessAisle('petit pois')).toBe('frozen');
  expect(guessAisle('bay leaf')).toBe('herbs-spices');
});

describe('singular', () => {
  it('handles common plurals and leaves the rest', () => {
    expect(['tomatoes', 'potatoes', 'berries', 'peaches', 'onions', 'hummus', 'couscous', 'peas', 'eggs'].map(singular)).toEqual([
      'tomato', 'potato', 'berry', 'peach', 'onion', 'hummus', 'couscous', 'pea', 'egg',
    ]);
  });
});

describe('aisles and staples', () => {
  it('makes sensible first guesses', () => {
    expect(guessAisle('chicken breast')).toBe('meat-fish');
    expect(guessAisle('chicken stock')).toBe('cupboard');
    expect(guessAisle('halloumi')).toBe('dairy-eggs');
    expect(guessAisle('red onion')).toBe('fruit-veg');
    expect(guessAisle('dried oregano')).toBe('herbs-spices');
    expect(guessAisle('pitta bread')).toBe('bakery');
    expect(guessAisle('mystery thing')).toBe('other');
    expect(guessAisle('red pepper')).toBe('fruit-veg');
    expect(guessAisle('garlic powder')).toBe('herbs-spices');
    expect(guessAisle('ground ginger')).toBe('herbs-spices');
    expect(guessAisle('cornstarch')).toBe('cupboard');
  });

  it('spots cupboard staples', () => {
    expect(isStaple('salt and pepper')).toBe(true);
    expect(isStaple('olive oil')).toBe(true);
    expect(isStaple('chicken breast')).toBe(false);
  });

  it('names and slugs', () => {
    expect(displayName('chicken breast')).toBe('Chicken breast');
    expect(slugify('Salt & pepper')).toBe('salt-and-pepper');
  });
});

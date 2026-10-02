import { describe, it, expect } from 'vitest';
import { timerWedgePath, formatMinutesShort, formatMinutesLong, splitStepDurations, bucketByTime } from '@/lib/time';
import { convertUnit, getEquivalentUnit, displayIngredient } from '@/lib/units';
import { splitSubtitle } from '@/lib/recipes';

describe('timerWedgePath', () => {
  it('draws nothing for zero minutes', () => {
    expect(timerWedgePath(0)).toBe('');
  });

  it('draws a quarter from 12 to 3 o\'clock for 15 minutes', () => {
    expect(timerWedgePath(15)).toBe('M90 90V0A90 90 0 0 1 180.00 90.00Z');
  });

  it('uses the large arc past half way', () => {
    expect(timerWedgePath(45)).toBe('M90 90V0A90 90 0 1 1 0.00 90.00Z');
  });

  it('returns null (draw a full circle) at an hour or more', () => {
    expect(timerWedgePath(60)).toBeNull();
    expect(timerWedgePath(75)).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('formats short durations', () => {
    expect(formatMinutesShort(45)).toBe('45 min');
    expect(formatMinutesShort(65)).toBe('1 hr 5 min');
    expect(formatMinutesShort(120)).toBe('2 hr');
  });

  it('formats long durations with plurals', () => {
    expect(formatMinutesLong(1)).toBe('1 minute');
    expect(formatMinutesLong(10)).toBe('10 minutes');
    expect(formatMinutesLong(65)).toBe('1 hour 5 minutes');
    expect(formatMinutesLong(120)).toBe('2 hours');
  });
});

describe('unit equivalents', () => {
  it('never converts spoon measures', () => {
    expect(getEquivalentUnit('tsp')).toBeNull();
    expect(getEquivalentUnit('tbsp')).toBeNull();
  });

  it('still converts weights', () => {
    expect(getEquivalentUnit('kg')).toBe('lb');
    expect(convertUnit(1, 'kg', 'lb')).toBe(2.2);
  });
});

describe('splitSubtitle', () => {
  it('splits a trailing bracketed name', () => {
    expect(splitSubtitle('Greek Lemon Roast Potatoes (Patates Lemonates tou Fournou)')).toEqual([
      'Greek Lemon Roast Potatoes',
      'Patates Lemonates tou Fournou',
    ]);
  });

  it('leaves titles without a trailing bracket alone', () => {
    expect(splitSubtitle('Tomato Soup')).toBeNull();
    expect(splitSubtitle('Chilli (Mild) Beef Stew')).toBeNull();
  });
});

describe('splitStepDurations', () => {
  it('turns durations into timer segments', () => {
    const parts = splitStepDurations('Bake for 45 minutes, turning once.');
    expect(parts).toEqual([
      { type: 'text', text: 'Bake for ' },
      { type: 'timer', text: '45 minutes', minutes: 45 },
      { type: 'text', text: ', turning once.' },
    ]);
  });

  it('uses the longer end of a range and converts hours', () => {
    expect(splitStepDurations('Simmer 20-25 mins')[1]).toMatchObject({ minutes: 25 });
    expect(splitStepDurations('Slow cook for 1.5 hours')[1]).toMatchObject({ minutes: 90 });
  });

  it('leaves steps without durations as one text segment', () => {
    expect(splitStepDurations('Preheat the oven to 200°C')).toEqual([
      { type: 'text', text: 'Preheat the oven to 200°C' },
    ]);
  });
});

describe('displayIngredient', () => {
  const potatoes = { quantity: 1000, unit: 'g' as const, name: 'potatoes' };

  it('steps grams up to kilograms', () => {
    expect(displayIngredient(potatoes, 4, 6, 'metric')).toMatchObject({ quantity: 1.5, unit: 'kg' });
  });

  it('converts to tidy imperial amounts', () => {
    expect(displayIngredient(potatoes, 4, 4, 'imperial')).toMatchObject({ quantity: 2.25, unit: 'lb' });
    expect(displayIngredient({ quantity: 150, unit: 'ml', name: 'olive oil' }, 4, 4, 'imperial'))
      .toMatchObject({ quantity: 5, unit: 'floz' });
  });

  it('keeps spoons as spoons and scales them to quarters', () => {
    expect(displayIngredient({ quantity: 3, unit: 'tsp', name: 'garlic' }, 4, 5, 'metric'))
      .toMatchObject({ quantity: 3.75, unit: 'tsp' });
  });

  it('leaves items without a quantity alone', () => {
    const salt = { quantity: null, unit: null, name: 'Salt and pepper' };
    expect(displayIngredient(salt, 4, 8, 'imperial')).toEqual(salt);
  });
});

describe('bucketByTime', () => {
  const r = (title: string, total_time: number | null) => ({ title, total_time });

  it('counts recipes cumulatively and takes examples from each band', () => {
    const buckets = bucketByTime([r('Houmous', 10), r('Salmon', 15), r('Soup', 30), r('Pie', 90), r('Untimed', null)]);
    expect(buckets.map((b) => b.count)).toEqual([2, 3, 3, 3]);
    expect(buckets[0].examples.map((e) => e.title)).toEqual(['Houmous', 'Salmon']);
    expect(buckets[1].examples.map((e) => e.title)).toEqual(['Soup']);
    expect(buckets[2].examples).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { timerWedgePath, formatMinutesShort, formatMinutesLong } from '@/lib/time';
import { convertUnit, getEquivalentUnit } from '@/lib/units';
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

import { describe, it, expect } from 'vitest';
import { parseDuration, durationInput, restNoun, restHeading, totalRest, describeRests, cleanRestPeriods } from '@/lib/rest';
import { formatMinutesShort } from '@/lib/time';

describe('parseDuration', () => {
  it.each([
    ['90', 90],
    ['45m', 45],
    ['45 mins', 45],
    ['1h', 60],
    ['1h 30m', 90],
    ['1 hour 30 minutes', 90],
    ['1.5 hours', 90],
    ['2 hrs, 15 mins', 135],
    ['1:30', 90],
    ['overnight', 720],
    ['1 day', 1440],
  ])('reads "%s" as %i minutes', (input, minutes) => {
    expect(parseDuration(input)).toBe(minutes);
  });

  it('refuses what it cannot understand', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('a while')).toBeNull();
    expect(parseDuration('2 hours ish')).toBeNull();
  });

  it('writes minutes back in the short form', () => {
    expect(durationInput(90)).toBe('1h 30m');
    expect(durationInput(240)).toBe('4h');
    expect(durationInput(20)).toBe('20m');
  });
});

describe('rest wording', () => {
  it('uses the type, or the custom label for "other"', () => {
    expect(restNoun({ type: 'set', minutes: 240 })).toBe('Setting');
    expect(restHeading({ type: 'prove', minutes: 60 })).toBe('Proving time');
    expect(restHeading({ type: 'other', label: 'freezing', minutes: 60 })).toBe('Freezing time');
    expect(restHeading({ type: 'other', label: 'Thawing time', minutes: 60 })).toBe('Thawing time');
  });

  it('adds up and describes several rests', () => {
    const rests = [
      { type: 'prove' as const, minutes: 60 },
      { type: 'cool' as const, minutes: 30 },
    ];
    expect(totalRest(rests)).toBe(90);
    expect(describeRests(rests, formatMinutesShort)).toBe('1 hr proving and 30 min cooling');
    expect(describeRests([{ type: 'set', minutes: 240 }], formatMinutesShort)).toBe('4 hr setting');
  });
});

describe('cleanRestPeriods', () => {
  it('drops bad rows and keeps labels only for "other"', () => {
    expect(
      cleanRestPeriods([
        { type: 'set', minutes: 240, label: 'ignored' },
        { type: 'other', minutes: 60, label: '  Freezing ' },
        { type: 'nap', minutes: 30 },
        { type: 'rest', minutes: 0 },
        { type: 'rest', minutes: 1.5 },
      ])
    ).toEqual([
      { type: 'set', minutes: 240 },
      { type: 'other', minutes: 60, label: 'Freezing' },
    ]);
  });
});

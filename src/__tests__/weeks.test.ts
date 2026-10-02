import { describe, it, expect } from 'vitest';
import { weekStartOf, addWeeks, formatWeekRange } from '@/lib/weeks';

describe('weeks', () => {
  it('finds the Monday of the week', () => {
    expect(weekStartOf('2026-10-02')).toBe('2026-09-28'); // Friday
    expect(weekStartOf('2026-09-28')).toBe('2026-09-28'); // Monday
    expect(weekStartOf('2026-10-04')).toBe('2026-09-28'); // Sunday
  });

  it('adds weeks across months', () => {
    expect(addWeeks('2026-09-28', 1)).toBe('2026-10-05');
    expect(addWeeks('2026-09-28', -4)).toBe('2026-08-31');
  });

  it('formats a week range', () => {
    expect(formatWeekRange('2026-10-05')).toBe('5–11 Oct');
    expect(formatWeekRange('2026-09-28')).toBe('28 Sept – 4 Oct');
  });
});

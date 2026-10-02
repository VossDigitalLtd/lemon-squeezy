// ─── Time helpers for the logo timer and recipe durations ───────────────────

/** Minutes that fill the logo timer completely. */
export const TIMER_FULL_MINUTES = 60;

/**
 * SVG path for the yellow wedge of the logo timer, in the logo's 180×180
 * viewBox. The wedge starts at 12 o'clock and runs clockwise: 15 min is a
 * quarter, 60 min or more is the whole circle (returned as `null`, draw a
 * circle instead). Returns '' for zero or negative minutes.
 */
export function timerWedgePath(minutes: number, full = TIMER_FULL_MINUTES): string | null {
  const fraction = Math.min(Math.max(minutes, 0), full) / full;
  if (fraction <= 0) return '';
  if (fraction >= 1) return null;

  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  const x = (90 + 90 * Math.cos(angle)).toFixed(2);
  const y = (90 + 90 * Math.sin(angle)).toFixed(2);
  const largeArc = fraction > 0.5 ? 1 : 0;
  return `M90 90V0A90 90 0 ${largeArc} 1 ${x} ${y}Z`;
}

/** 45 → "45 min", 65 → "1 hr 5 min", 120 → "2 hr" */
export function formatMinutesShort(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** 45 → "45 minutes", 65 → "1 hour 5 minutes", 1 → "1 minute" */
export function formatMinutesLong(minutes: number): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (minutes < 60) return plural(minutes, 'minute');
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${plural(h, 'hour')} ${plural(m, 'minute')}` : plural(h, 'hour');
}

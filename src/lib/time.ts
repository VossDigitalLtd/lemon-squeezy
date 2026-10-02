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

// ─── Durations inside method text ───────────────────────────────────────────

export type StepSegment =
  | { type: 'text'; text: string }
  | { type: 'timer'; text: string; minutes: number };

const DURATION_RE =
  /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)\b/gi;

/**
 * Split a method step into plain text and durations that can become timers.
 * "bake for 45 minutes, turning" → text, timer(45), text.
 * Ranges use the longer time ("20-25 minutes" → 25). Hours become minutes.
 */
export function splitStepDurations(step: string): StepSegment[] {
  const segments: StepSegment[] = [];
  let last = 0;

  for (const match of step.matchAll(DURATION_RE)) {
    const [text, from, to, unit] = match;
    const value = parseFloat(to ?? from);
    const minutes = Math.round(/^h/i.test(unit) ? value * 60 : value);
    if (minutes <= 0) continue;

    const start = match.index ?? 0;
    if (start > last) segments.push({ type: 'text', text: step.slice(last, start) });
    segments.push({ type: 'timer', text, minutes });
    last = start + text.length;
  }

  if (last < step.length) segments.push({ type: 'text', text: step.slice(last) });
  return segments;
}

// ─── "How long have you got?" buckets ───────────────────────────────────────

export const TIME_BUCKETS = [15, 30, 45, 60] as const;

export interface TimeBucket<T> {
  minutes: number;
  /** Recipes at or under this total time (matches /recipes?time=N) */
  count: number;
  /** A few recipes from this band only (over the previous bucket), for "Like …" */
  examples: T[];
}

export function bucketByTime<T extends { total_time: number | null }>(
  recipes: T[],
  examplesPerBucket = 2
): TimeBucket<T>[] {
  return TIME_BUCKETS.map((minutes, i) => {
    const lower = i === 0 ? 0 : TIME_BUCKETS[i - 1];
    const timed = recipes.filter((r) => r.total_time != null && r.total_time > 0);
    return {
      minutes,
      count: timed.filter((r) => r.total_time! <= minutes).length,
      examples: timed
        .filter((r) => r.total_time! > lower && r.total_time! <= minutes)
        .slice(0, examplesPerBucket),
    };
  });
}

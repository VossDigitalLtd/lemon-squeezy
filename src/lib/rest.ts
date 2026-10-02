// ─── Rest periods: resting, setting, chilling, proving… ─────────────────────

export const REST_TYPES = ['rest', 'set', 'chill', 'cool', 'marinate', 'prove', 'soak', 'other'] as const;
export type RestType = (typeof REST_TYPES)[number];

export type RestWhen = 'before' | 'after';

export interface RestPeriod {
  type: RestType;
  /** Only for type "other", e.g. "Freezing" */
  label?: string;
  minutes: number;
  /** Before or after cooking; left out = the type's usual position */
  when?: RestWhen;
}

/** Where each kind of rest usually happens */
export const DEFAULT_WHEN: Record<RestType, RestWhen> = {
  marinate: 'before',
  prove: 'before',
  soak: 'before',
  chill: 'before',
  rest: 'after',
  set: 'after',
  cool: 'after',
  other: 'after',
};

export function restWhen(period: RestPeriod): RestWhen {
  return period.when ?? DEFAULT_WHEN[period.type] ?? 'after';
}

export type TimeStage =
  | { kind: 'prep'; minutes: number }
  | { kind: 'cook'; minutes: number }
  | { kind: 'rest'; minutes: number; period: RestPeriod };

/**
 * Times in cooking order: prep, rests before cooking, cook, rests after.
 * Rests in the same position keep the order they were entered in.
 */
export function timeSequence(prep: number | null, cook: number | null, rests: RestPeriod[] | null | undefined): TimeStage[] {
  const list = (rests ?? []).filter((r) => r.minutes > 0);
  const stages: TimeStage[] = [];
  if (prep) stages.push({ kind: 'prep', minutes: prep });
  for (const r of list.filter((r) => restWhen(r) === 'before')) stages.push({ kind: 'rest', minutes: r.minutes, period: r });
  if (cook) stages.push({ kind: 'cook', minutes: cook });
  for (const r of list.filter((r) => restWhen(r) === 'after')) stages.push({ kind: 'rest', minutes: r.minutes, period: r });
  return stages;
}

/** Choice shown in the admin form, and the noun used on the recipe page */
export const REST_TYPE_INFO: Record<RestType, { option: string; noun: string; example: string }> = {
  rest: { option: 'Rest', noun: 'Resting', example: 'meat, risotto' },
  set: { option: 'Set', noun: 'Setting', example: 'cheesecake, jelly' },
  chill: { option: 'Chill', noun: 'Chilling', example: 'pastry, cookie dough' },
  cool: { option: 'Cool', noun: 'Cooling', example: 'lasagne, bread' },
  marinate: { option: 'Marinate', noun: 'Marinating', example: 'kebabs, chicken' },
  prove: { option: 'Prove', noun: 'Proving', example: 'bread, dough' },
  soak: { option: 'Soak', noun: 'Soaking', example: 'beans, chickpeas' },
  other: { option: 'Other…', noun: 'Resting', example: 'your own wording' },
};

/** "Setting", "Proving", or the custom label for "other" */
export function restNoun(period: RestPeriod): string {
  if (period.type === 'other' && period.label?.trim()) {
    const l = period.label.trim();
    return l[0].toUpperCase() + l.slice(1);
  }
  return REST_TYPE_INFO[period.type]?.noun ?? 'Resting';
}

/** "Setting time" for headings like Prep time / Cook time */
export function restHeading(period: RestPeriod): string {
  const noun = restNoun(period);
  return /time$/i.test(noun) ? noun : `${noun} time`;
}

/** Total minutes across rest periods */
export function totalRest(periods: RestPeriod[] | null | undefined): number {
  return (periods ?? []).reduce((sum, p) => sum + (Number.isFinite(p.minutes) && p.minutes > 0 ? p.minutes : 0), 0);
}

/** "4 hr setting" / "1 hr proving and 30 min cooling" for the "Ready in" line */
export function describeRests(periods: RestPeriod[], format: (m: number) => string): string {
  const parts = periods.filter((p) => p.minutes > 0).map((p) => `${format(p.minutes)} ${restNoun(p).toLowerCase()}`);
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/**
 * Read a typed duration into minutes. Accepts "90", "45m", "1h", "1h 30m",
 * "1.5 hours", "2 hrs 15 mins", "1:30", and "overnight" (12 hours).
 * Returns null if it can't make sense of it.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s === 'overnight') return 12 * 60;

  const clock = s.match(/^(\d+):(\d{1,2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  if (/^\d+$/.test(s)) return Number(s);

  const re = /(\d+(?:\.\d+)?)\s*(d|days?|h|hrs?|hours?|m|mins?|minutes?)\b/g;
  let total = 0;
  let matched = '';
  for (const m of s.matchAll(re)) {
    const n = parseFloat(m[1]);
    const unit = m[2][0];
    total += unit === 'd' ? n * 24 * 60 : unit === 'h' ? n * 60 : n;
    matched += m[0];
  }
  // Everything apart from spaces, commas and "and" must have been understood
  const leftover = s.replace(re, '').replace(/[\s,]+|and/g, '');
  if (!matched || leftover) return null;
  return Math.round(total);
}

/** Minutes back into the short form used in the admin field: 90 → "1h 30m" */
export function durationInput(minutes: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
}

/** Keep only well-formed periods (used when saving) */
export function cleanRestPeriods(input: unknown): RestPeriod[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((p) => p && (REST_TYPES as readonly string[]).includes(p.type) && Number.isInteger(p.minutes) && p.minutes > 0 && p.minutes <= 7 * 24 * 60)
    .slice(0, 6)
    .map((p) => ({
      type: p.type as RestType,
      minutes: p.minutes as number,
      ...(p.type === 'other' && typeof p.label === 'string' && p.label.trim() ? { label: p.label.trim().slice(0, 40) } : {}),
      // Only stored when it differs from the type's usual position
      ...((p.when === 'before' || p.when === 'after') && p.when !== DEFAULT_WHEN[p.type as RestType] ? { when: p.when as RestWhen } : {}),
    }));
}

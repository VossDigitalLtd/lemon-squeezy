// ─── Weeks (Monday to Sunday, UTC dates as YYYY-MM-DD) ──────────────────────

const DAY = 24 * 60 * 60 * 1000;

/** Monday of the week containing `date`, as YYYY-MM-DD */
export function weekStartOf(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T12:00:00Z`) : date;
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(utc).getUTCDay() + 6) % 7; // Monday = 0
  return new Date(utc - dow * DAY).toISOString().slice(0, 10);
}

export function addWeeks(weekStart: string, weeks: number): string {
  return new Date(new Date(`${weekStart}T12:00:00Z`).getTime() + weeks * 7 * DAY).toISOString().slice(0, 10);
}

/** "5–11 Oct", "28 Sept – 4 Oct" */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start.getTime() + 6 * DAY);
  const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' });
  const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${day(start)}–${day(end)} ${month(end)}`
    : `${day(start)} ${month(start)} – ${day(end)} ${month(end)}`;
}

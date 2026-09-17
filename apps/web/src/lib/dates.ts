/**
 * Reads a `YYYY-MM-DD` column as a local calendar date. `new Date(str)` parses
 * it as UTC midnight, which shows the previous day west of Greenwich.
 */
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value: string): string {
  return DAY_FORMAT.format(parseLocalDate(value));
}

/** "21–27 sept. 2026", "29 sept. – 5 oct. 2026"… — the shared parts are merged. */
export function formatPeriod(start: string, durationDays: number): string {
  const from = parseLocalDate(start);
  const to = new Date(from);
  to.setDate(from.getDate() + Math.max(durationDays, 1) - 1);
  return DAY_FORMAT.formatRange(from, to);
}

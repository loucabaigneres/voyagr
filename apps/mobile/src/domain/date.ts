const LOCALE = 'fr-FR';

/** "12 janv. 2026" (`short`, default) or "12 janvier 2026" (`long`). */
export function formatDate(
  value: string | Date | null | undefined,
  month: 'short' | 'long' = 'short',
): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month, year: 'numeric' });
}

/** "1 jour", "3 jours" — French pluralisation for counted nouns. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

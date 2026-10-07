import { formatDate, plural } from './date';

describe('formatDate', () => {
  it('formats an ISO date in French', () => {
    expect(formatDate('2026-01-12T10:00:00Z', 'long')).toBe('12 janvier 2026');
  });

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});

describe('plural', () => {
  it('pluralises above one', () => {
    expect(plural(1, 'jour')).toBe('1 jour');
    expect(plural(3, 'jour')).toBe('3 jours');
    expect(plural(2, 'étape')).toBe('2 étapes');
  });
});

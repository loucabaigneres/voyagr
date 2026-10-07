import { cn } from './cn';

describe('cn', () => {
  it('lets later classes override earlier ones', () => {
    expect(cn('p-4 text-ink', 'p-2')).toBe('text-ink p-2');
  });

  it('knows the custom radii from the design tokens', () => {
    expect(cn('rounded-card', 'rounded-button')).toBe('rounded-button');
  });

  it('knows the custom type scale and keeps size and colour apart', () => {
    expect(cn('text-body text-ink', 'text-title')).toBe('text-ink text-title');
    expect(cn('text-body text-ink', 'text-brand')).toBe('text-body text-brand');
  });

  it('drops falsy values', () => {
    expect(cn('a', null, undefined, false, 'c')).toBe('a c');
  });
});

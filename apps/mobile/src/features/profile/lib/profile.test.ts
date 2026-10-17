import { avatarInitial, nameChange } from './profile';

describe('avatarInitial', () => {
  it('uses the first letter of the name, uppercased', () => {
    expect(avatarInitial('  élodie ', 'e@mail.com')).toBe('É');
  });

  it('falls back to the email, then to a question mark', () => {
    expect(avatarInitial('   ', 'zoe@mail.com')).toBe('Z');
    expect(avatarInitial(null, undefined)).toBe('?');
  });

  it('keeps a character outside the basic plane whole', () => {
    expect(avatarInitial('𝒜lix')).toBe('𝒜');
  });
});

describe('nameChange', () => {
  it('is ready with the trimmed name when it differs', () => {
    expect(nameChange('  Léa ', 'Lea')).toEqual({ status: 'ready', name: 'Léa' });
  });

  it('does nothing when only whitespace changed', () => {
    expect(nameChange('Léa  ', 'Léa')).toEqual({ status: 'unchanged' });
  });

  it('rejects a name the API would refuse', () => {
    const change = nameChange(' L ', 'Léa');
    expect(change.status).toBe('invalid');
  });
});

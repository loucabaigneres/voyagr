import { authCallbackURL } from './callback-url';

describe('authCallbackURL', () => {
  it('keeps the app path on native, for the Expo plugin to turn into a deep link', () => {
    expect(authCallbackURL('/profile', 'ios')).toBe('/profile');
    expect(authCallbackURL('/profile', 'android', 'http://localhost:8081')).toBe('/profile');
  });

  it('makes the path absolute on web', () => {
    expect(authCallbackURL('/profile', 'web', 'http://localhost:8081')).toBe(
      'http://localhost:8081/profile',
    );
  });

  it('refuses to guess the origin on web', () => {
    expect(() => authCallbackURL('/profile', 'web')).toThrow();
  });
});

import { authErrorMessage } from './errors';

describe('authErrorMessage', () => {
  it('translates known Better Auth codes', () => {
    expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(
      'Email ou mot de passe incorrect.',
    );
    expect(authErrorMessage({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' })).toMatch(
      /existe déjà/,
    );
  });

  it('explains rate limiting whatever the code', () => {
    expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 429 })).toMatch(
      /Trop de tentatives/,
    );
  });

  it('never leaks the raw English message of an unknown error', () => {
    const message = authErrorMessage({ code: 'SOMETHING_NEW', message: 'Internal stuff' });
    expect(message).not.toMatch(/Internal/);
    expect(authErrorMessage(null)).toBe(message);
  });
});

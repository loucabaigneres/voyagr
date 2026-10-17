import { signInSchema, signUpSchema, validate } from './validation';

describe('validate(signInSchema)', () => {
  it('normalises the email', () => {
    const result = validate(signInSchema, { email: '  Lea@Mail.COM ', password: 'secret' });
    expect(result).toEqual({ success: true, data: { email: 'lea@mail.com', password: 'secret' } });
  });

  it('reports one message per invalid field', () => {
    const result = validate(signInSchema, { email: 'nope', password: '' });
    expect(result).toEqual({
      success: false,
      errors: {
        email: 'Cet email ne semble pas valide.',
        password: 'Entre ton mot de passe.',
      },
    });
  });
});

describe('validate(signUpSchema)', () => {
  const valid = { name: 'Léa', email: 'lea@mail.com', password: '12345678' };

  it('accepts a complete form and trims the name', () => {
    const result = validate(signUpSchema, { ...valid, name: '  Léa  ' });
    expect(result).toEqual({ success: true, data: valid });
  });

  it('rejects a name shorter than the API allows', () => {
    const result = validate(signUpSchema, { ...valid, name: ' L ' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name).toMatch(/au moins 2/);
  });

  it('rejects a password shorter than Better Auth allows', () => {
    const result = validate(signUpSchema, { ...valid, password: '1234567' });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.errors)).toEqual(['password']);
  });
});

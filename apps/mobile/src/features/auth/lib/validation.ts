import * as z from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MIN_LENGTH = 2;

const email = z.string().trim().toLowerCase().pipe(z.email('Cet email ne semble pas valide.'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Entre ton mot de passe.'),
});

export const nameSchema = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, `Ton prénom doit faire au moins ${NAME_MIN_LENGTH} caractères.`);

export const signUpSchema = z.object({
  name: nameSchema,
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères.`)
    .max(PASSWORD_MAX_LENGTH, `${PASSWORD_MAX_LENGTH} caractères maximum.`),
});

export type SignInValues = z.input<typeof signInSchema>;
export type SignUpValues = z.input<typeof signUpSchema>;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type ValidationResult<T, Out> =
  | { success: true; data: Out }
  | { success: false; errors: FieldErrors<T> };

export function validate<S extends z.ZodObject>(
  schema: S,
  values: z.input<S>,
): ValidationResult<z.input<S>, z.output<S>> {
  const result = schema.safeParse(values);
  if (result.success) return { success: true, data: result.data };

  const errors: FieldErrors<z.input<S>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof z.input<S> | undefined;
    if (field !== undefined && !errors[field]) errors[field] = issue.message;
  }
  return { success: false, errors };
}

import { nameSchema } from '@/features/auth/lib/validation';

/** Letter shown in the avatar: the name's first character, else the email's, else "?". */
export function avatarInitial(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  // `Array.from` splits by code point, so an accented or astral first letter stays whole.
  const [first] = Array.from(source);
  return first ? first.toLocaleUpperCase('fr-FR') : '?';
}

export type NameChange =
  | { status: 'unchanged' }
  | { status: 'invalid'; error: string }
  | { status: 'ready'; name: string };

export function nameChange(draft: string, current: string | null | undefined): NameChange {
  const result = nameSchema.safeParse(draft);
  if (!result.success) {
    return { status: 'invalid', error: result.error.issues[0]?.message ?? 'Nom invalide.' };
  }
  if (result.data === current?.trim()) return { status: 'unchanged' };
  return { status: 'ready', name: result.data };
}

import { TRPCClientError } from '@trpc/client';

/** tRPC codes whose server message is written for the end user. */
const USER_FACING_CODES = new Set([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
]);

const NETWORK_MESSAGE = 'Connexion au serveur impossible. Vérifie ta connexion puis réessaie.';

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof TRPCClientError)) return undefined;
  return (error.data as { code?: string } | undefined)?.code;
}

/** 4xx-style failure: retrying the same request cannot succeed. */
export function isClientError(error: unknown): boolean {
  const code = errorCode(error);
  return code !== undefined && USER_FACING_CODES.has(code);
}

export function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof TRPCClientError)) return fallback;

  // No payload means the request never got an answer.
  if (!errorCode(error)) return NETWORK_MESSAGE;
  if (!isClientError(error)) return fallback;

  // Input validation failures arrive as a JSON dump of the zod issues.
  const message = error.message.trim();
  if (!message || message.startsWith('[') || message.startsWith('{')) return fallback;
  return message;
}

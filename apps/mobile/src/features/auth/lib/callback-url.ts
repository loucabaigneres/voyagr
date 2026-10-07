/**
 * Where Better Auth sends the user back after Google.
 * Native: keep the app path — the Expo plugin turns it into a deep link (`voyagr://…`, `exp://…`).
 * Web: must be absolute, or the API resolves it against its own URL.
 */
export function authCallbackURL(path: `/${string}`, platform: string, webOrigin?: string): string {
  if (platform !== 'web') return path;
  if (!webOrigin) throw new Error('authCallbackURL: the web origin is required on web.');
  return new URL(path, webOrigin).toString();
}

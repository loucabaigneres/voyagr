import { parseOEmbedTitle, parseOgTags } from './extraction.js';

const TIMEOUT_MS = 5000;

/**
 * Fetches the caption of a public TikTok video via its free oEmbed endpoint.
 * Never throws — returns null on any network/parsing failure.
 */
export async function fetchTikTokCaption(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return parseOEmbedTitle(json);
  } catch {
    return null;
  }
}

/**
 * Best-effort fetch of a public Instagram post's caption via og:title/og:description
 * meta tags. Instagram no longer offers a free oEmbed API, so this frequently fails
 * (login walls, bot detection) — that is expected, not a bug. Never throws.
 */
export async function fetchInstagramCaption(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoyagrBot/1.0)' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const { title, description } = parseOgTags(html);
    return description ?? title;
  } catch {
    return null;
  }
}

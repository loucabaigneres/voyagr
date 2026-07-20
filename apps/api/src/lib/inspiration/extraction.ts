import type { platformEnum } from '@voyagr/database';

type Platform = (typeof platformEnum.enumValues)[number];

/** Detects the source platform from a URL's hostname. Never throws. */
export function detectPlatform(rawUrl: string): Platform {
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return 'other';
  }

  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'tiktok';
  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'instagram';
  return 'other';
}

const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

/** Extracts unique, lowercased hashtags from free text, in first-seen order. */
export function extractHashtags(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) {
    seen.add(match[1].toLowerCase());
  }
  return [...seen];
}

/**
 * Finds the first known place mentioned in `text` (case-insensitive substring
 * match), preferring the longest match when several places overlap.
 * Returns '' when nothing matches.
 */
export function matchLocation(text: string, knownPlaces: string[]): string {
  const lowerText = text.toLowerCase();
  const candidates = knownPlaces
    .filter((place) => place.trim().length > 0)
    .filter((place) => lowerText.includes(place.toLowerCase()))
    .sort((a, b) => b.length - a.length);

  return candidates[0] ?? '';
}

/** Defensively pulls the `title` string out of a TikTok oEmbed JSON payload. */
export function parseOEmbedTitle(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return null;
  const title = (json as Record<string, unknown>).title;
  return typeof title === 'string' && title.trim().length > 0 ? title : null;
}

function extractMetaContent(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${property}["']`,
    'i',
  );
  const match = html.match(re) ?? html.match(reversed);
  if (!match) return null;
  const value = match[1].trim();
  return value.length > 0 ? decodeHtmlEntities(value) : null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/** Defensively pulls og:title / og:description out of a raw HTML document. */
export function parseOgTags(html: string): { title: string | null; description: string | null } {
  return {
    title: extractMetaContent(html, 'og:title'),
    description: extractMetaContent(html, 'og:description'),
  };
}

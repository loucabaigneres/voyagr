const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

/** "TikTok", "Instagram", or "Lien" for anything else. */
export function platformLabel(platform: string | null | undefined): string {
  return (platform && PLATFORM_LABELS[platform]) || 'Lien';
}

/** Tags ready to display: "#"-prefixed, trimmed, without empties or duplicates. */
export function formatHashtags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, '');
    const key = tag.toLocaleLowerCase('fr-FR');
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(`#${tag}`);
  }
  return result;
}

/** "tiktok.com/@lea/video/…" — the link without protocol or "www.", for a compact caption. */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
}

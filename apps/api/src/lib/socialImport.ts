/**
 * Récupération des légendes de contenus TikTok / Instagram et extraction des hashtags.
 *
 * Volontairement sans dépendance à la base de données ni à tRPC : ces fonctions sont
 * pures (hormis les appels réseau) et testables isolément.
 */

export type Platform = 'tiktok' | 'instagram' | 'other';

export type CaptionResult =
  | { ok: true; caption: string }
  | { ok: false; reason: 'unsupported' | 'not_found' | 'blocked' | 'network' };

const TIKTOK_HOSTS = ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'];
const INSTAGRAM_HOSTS = ['instagram.com', 'instagr.am', 'ig.me'];

// Instagram sert une page vide aux clients non navigateurs : on se présente comme un navigateur.
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 8000;

const matchesHost = (hostname: string, hosts: string[]) =>
  hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));

export const detectPlatform = (url: string): Platform => {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'other';
  }

  if (matchesHost(hostname, TIKTOK_HOSTS)) return 'tiktok';
  if (matchesHost(hostname, INSTAGRAM_HOSTS)) return 'instagram';
  return 'other';
};

/**
 * Extrait les hashtags d'une légende. Les tags sont stockés sans le `#`, en minuscules
 * et dédoublonnés — cohérent avec le format déjà utilisé par les seeds.
 */
export const extractHashtags = (caption: string): string[] => {
  const matches = caption.matchAll(/#([\p{L}\p{N}_]+)/gu);
  const tags = new Set<string>();

  for (const match of matches) {
    const tag = match[1]?.toLowerCase();
    if (tag) tags.add(tag);
  }

  return [...tags];
};

const fetchTikTokCaption = async (url: string): Promise<CaptionResult> => {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

  const response = await fetch(oembedUrl, {
    headers: { 'User-Agent': BROWSER_USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return { ok: false, reason: response.status === 404 ? 'not_found' : 'blocked' };
  }

  const data = (await response.json()) as { title?: string };
  // `title` contient la légende complète de la vidéo, hashtags inclus.
  if (!data.title) return { ok: false, reason: 'not_found' };

  return { ok: true, caption: data.title };
};

/**
 * L'oEmbed officiel d'Instagram exige désormais un token applicatif Meta : on se rabat
 * sur la balise Open Graph de la page publique. Best-effort — Instagram bloque
 * fréquemment les requêtes venant d'IP serveur, d'où le fallback manuel côté UI.
 */
const fetchInstagramCaption = async (url: string): Promise<CaptionResult> => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return { ok: false, reason: response.status === 404 ? 'not_found' : 'blocked' };
  }

  const html = await response.text();
  const caption = extractOpenGraphDescription(html);

  if (!caption) return { ok: false, reason: 'blocked' };

  return { ok: true, caption };
};

export const extractOpenGraphDescription = (html: string): string | null => {
  const match =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);

  const raw = match?.[1];
  if (!raw) return null;

  return decodeHtmlEntities(raw).trim() || null;
};

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(
      /&([a-z0-9#]+);/gi,
      (entity, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? entity,
    );

/**
 * Ne lève jamais d'exception : l'appelant doit pouvoir proposer la saisie manuelle
 * de la légende plutôt que d'afficher une erreur brute.
 */
export const fetchCaption = async (url: string): Promise<CaptionResult> => {
  const platform = detectPlatform(url);

  try {
    if (platform === 'tiktok') return await fetchTikTokCaption(url);
    if (platform === 'instagram') return await fetchInstagramCaption(url);
    return { ok: false, reason: 'unsupported' };
  } catch {
    return { ok: false, reason: 'network' };
  }
};

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

// Les posts photo TikTok n'ont pas d'oEmbed, et la page rend une coquille vide à un UA
// navigateur. En revanche, avec un UA de crawler social, TikTok renvoie un aperçu Open
// Graph (légende + image de couverture) : c'est ce qu'on exploite en repli.
const CRAWLER_USER_AGENT =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const FETCH_TIMEOUT_MS = 8000;

const matchesHost = (hostname: string, hosts: string[]) =>
  hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));

/**
 * Clé de dédup d'un contenu : hôte (sans `www.`) + chemin sans slash final, query et
 * fragment retirés. Deux collages du même lien donnent la même clé.
 */
export const normalizeContentUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
};

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

/**
 * Retire les hashtags de la légende : ils sont déjà stockés à part dans `extracted_tags`,
 * inutile de les répéter dans la description. Les espaces laissés par la suppression
 * sont recollés, mais les retours à la ligne d'origine sont préservés.
 */
export const stripHashtags = (caption: string): string =>
  caption
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[^\S\n]{2,}/g, ' ') // espaces/tabs multiples, sans toucher aux sauts de ligne
    .replace(/[^\S\n]+\n/g, '\n') // espaces en fin de ligne
    .replace(/\n{3,}/g, '\n\n')
    .trim();

interface TikTokOembed {
  title?: string;
  thumbnail_url?: string;
}

/**
 * Suit les redirections pour transformer un lien court (`vm.tiktok.com/...`) en URL
 * canonique (`tiktok.com/@compte/video/ID`). L'oEmbed TikTok n'accepte de façon fiable
 * que l'URL canonique : appelé sur un lien court, il renvoie souvent un 400.
 * Best-effort : en cas d'échec, on renvoie l'URL d'origine.
 */
const resolveTikTokUrl = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    // On n'a besoin que de l'URL finale, pas du corps de la page.
    await response.body?.cancel().catch(() => {});

    const finalUrl = response.url || url;
    const parsed = new URL(finalUrl);
    // On retire les paramètres de tracking (`?_r=...&_t=...`) que l'oEmbed digère mal.
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
};

const fetchTikTokOembed = async (canonicalUrl: string): Promise<TikTokOembed | null> => {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`;

  const response = await fetch(oembedUrl, {
    headers: { 'User-Agent': BROWSER_USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  // 400 = contenu non supporté par l'oEmbed (ex. posts /photo/) ; null -> fallback manuel.
  if (!response.ok) return null;

  return (await response.json().catch(() => null)) as TikTokOembed | null;
};

const fetchTikTokCaption = async (url: string): Promise<CaptionResult> => {
  const data = await fetchTikTokOembed(await resolveTikTokUrl(url));

  // `title` contient la légende complète de la vidéo, hashtags inclus.
  if (!data?.title) return { ok: false, reason: 'not_found' };

  return { ok: true, caption: data.title };
};

/**
 * Média exploitable par l'analyse IA : la légende, les URLs des images d'aperçu et, pour
 * les vidéos TikTok, la transcription des sous-titres (le contenu parlé, qui nomme souvent
 * des lieux absents de la légende). On ne télécharge jamais la vidéo elle-même.
 */
export interface MediaResult {
  caption: string | null;
  imageUrls: string[];
  transcript: string | null;
}

/** Convertit un fichier WebVTT en texte brut (sans horodatages ni balises, dédupliqué). */
const vttToText = (vtt: string): string => {
  const lines: string[] = [];
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line === 'WEBVTT' || line.includes('-->') || /^\d+$/.test(line)) continue;
    const clean = line.replace(/<[^>]+>/g, '').trim();
    // On ignore les répétitions consécutives fréquentes dans les sous-titres ASR.
    if (clean && lines[lines.length - 1] !== clean) lines.push(clean);
  }
  const text = lines.join(' ');
  return text.length > 4000 ? text.slice(0, 4000) : text;
};

interface TikTokSubtitleInfo {
  LanguageCodeName?: string;
  Url?: string;
}

/**
 * Récupère la transcription (sous-titres auto-générés) d'une vidéo TikTok via le JSON
 * embarqué de la page. Best-effort : `null` si la page ou la piste n'est pas disponible.
 * Préfère le français, sinon la première piste.
 */
const fetchTikTokSubtitles = async (canonicalUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(canonicalUrl, {
      headers: { 'User-Agent': BROWSER_USER_AGENT, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const html = await response.text();
    const match = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/,
    );
    if (!match) return null;

    const data = JSON.parse(match[1]!) as {
      __DEFAULT_SCOPE__?: {
        'webapp.video-detail'?: {
          itemInfo?: { itemStruct?: { video?: { subtitleInfos?: TikTokSubtitleInfo[] } } };
        };
      };
    };
    const subs =
      data.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct?.video?.subtitleInfos;
    if (!Array.isArray(subs) || subs.length === 0) return null;

    const track = subs.find((s) => /^fr/i.test(s.LanguageCodeName ?? '')) ?? subs[0];
    if (!track?.Url) return null;

    const vttResponse = await fetch(track.Url, {
      headers: { 'User-Agent': BROWSER_USER_AGENT, Referer: 'https://www.tiktok.com/' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!vttResponse.ok) return null;

    return vttToText(await vttResponse.text()) || null;
  } catch {
    return null;
  }
};

/**
 * Repli pour les contenus sans oEmbed (posts /photo/) : on lit l'aperçu Open Graph
 * servi aux crawlers sociaux. Donne la légende et l'image de couverture (pas tout le
 * carrousel : seule la couverture est exposée côté serveur).
 */
const fetchTikTokPageOg = async (canonicalUrl: string): Promise<MediaResult> => {
  const response = await fetch(canonicalUrl, {
    headers: { 'User-Agent': CRAWLER_USER_AGENT, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return { caption: null, imageUrls: [], transcript: null };

  const html = await response.text();
  const image = extractOpenGraphImage(html);

  return {
    caption: stripTikTokOgPrefix(extractOpenGraphDescription(html)),
    imageUrls: image ? [image] : [],
    transcript: null,
  };
};

// L'og:description TikTok est préfixée « TikTok | » (ou « TikTok · ») : on la retire.
const stripTikTokOgPrefix = (caption: string | null): string | null => {
  if (!caption) return null;
  const cleaned = caption.replace(/^TikTok\s*[|·:]\s*/i, '').trim();
  return cleaned || null;
};

const fetchTikTokMedia = async (url: string): Promise<MediaResult> => {
  const canonicalUrl = await resolveTikTokUrl(url);
  const data = await fetchTikTokOembed(canonicalUrl);

  if (data?.title || data?.thumbnail_url) {
    return {
      caption: data.title?.trim() || null,
      imageUrls: data.thumbnail_url ? [data.thumbnail_url] : [],
      // La vidéo nomme souvent des lieux à l'oral : on récupère la transcription.
      transcript: await fetchTikTokSubtitles(canonicalUrl),
    };
  }

  // Pas d'oEmbed exploitable (ex. post photo) : on tente l'aperçu Open Graph.
  return fetchTikTokPageOg(canonicalUrl);
};

// L'og:description Instagram est préfixée par les stats d'engagement et l'auteur,
// p.ex. « 728 likes, 53 comments - auteur on December 29, 2024: "<légende>" ».
// On retire le compteur de likes/comments ; si le format ne correspond pas (autre
// langue), on garde la description telle quelle.
const stripInstagramOgPrefix = (caption: string | null): string | null => {
  if (!caption) return null;
  const cleaned = caption.replace(/^[\d.,\s]+likes?,\s*[\d.,\s]+comments?\s*-\s*/i, '').trim();
  return cleaned || null;
};

/**
 * Instagram rend une coquille vide à un UA navigateur depuis une IP serveur, mais sert
 * son aperçu Open Graph (légende + image) à un crawler social. On exploite ce canal,
 * comme pour les posts photo TikTok. Best-effort : contenus privés/age-gated -> vide,
 * d'où le fallback « coller la description » côté UI.
 */
const fetchInstagramOg = async (url: string): Promise<MediaResult> => {
  const response = await fetch(url, {
    headers: { 'User-Agent': CRAWLER_USER_AGENT, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return { caption: null, imageUrls: [], transcript: null };

  const html = await response.text();
  const image = extractOpenGraphImage(html);

  return {
    caption: stripInstagramOgPrefix(extractOpenGraphDescription(html)),
    imageUrls: image ? [image] : [],
    transcript: null,
  };
};

/**
 * Ne lève jamais : renvoie ce qu'on a pu obtenir (éventuellement vide), à charge
 * pour l'appelant de décider si c'est suffisant pour lancer l'analyse.
 */
export const fetchMedia = async (url: string): Promise<MediaResult> => {
  const platform = detectPlatform(url);

  try {
    if (platform === 'tiktok') return await fetchTikTokMedia(url);
    if (platform === 'instagram') return await fetchInstagramOg(url);
  } catch {
    return { caption: null, imageUrls: [], transcript: null };
  }

  return { caption: null, imageUrls: [], transcript: null };
};

/**
 * L'oEmbed officiel d'Instagram exige un token applicatif Meta : on se rabat sur l'aperçu
 * Open Graph servi aux crawlers (cf. `fetchInstagramOg`). Best-effort — contenus privés
 * ou indisponibles -> `blocked`, d'où le fallback manuel côté UI.
 */
const fetchInstagramCaption = async (url: string): Promise<CaptionResult> => {
  const { caption } = await fetchInstagramOg(url);

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

export const extractOpenGraphImage = (html: string): string | null => {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i);

  const raw = match?.[1];
  if (!raw) return null;

  return decodeHtmlEntities(raw).trim() || null;
};

/** Taille maximale d'une image d'aperçu relayée vers l'IA. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Télécharge une image d'aperçu et la renvoie encodée en base64, prête à être
 * envoyée à Gemini en `inlineData`. Best-effort : renvoie `null` (sans lever) si
 * la ressource est inaccessible, n'est pas une image, ou dépasse la taille limite.
 */
export const downloadImageAsInline = async (
  rawUrl: string,
): Promise<{ mimeType: string; data: string } | null> => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  try {
    const response = await fetch(rawUrl, {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!mimeType.startsWith('image/')) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;

    return { mimeType, data: buffer.toString('base64') };
  } catch {
    return null;
  }
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

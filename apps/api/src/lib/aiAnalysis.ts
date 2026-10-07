/**
 * Socle de l'analyse d'inspiration, indépendant de l'API appelée : types d'entrée/sortie,
 * erreur typée, prompt système, parsing de la réponse JSON et `fetch` avec retry. Le
 * client `gemini.ts` ne garde que ce qui lui est propre (endpoint, format, schéma).
 */

import type { ExtractedPlace, PlaceCategory } from '@voyagr/database';

const coerceCategory = (value: unknown): PlaceCategory | null => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'restaurant') return 'restaurant';
  if (v === 'hotel' || v === 'hôtel') return 'hotel';
  if (v === 'activité' || v === 'activite' || v === 'activity') return 'activité';
  if (v === 'autre' || v === 'other') return 'autre';
  return null;
};

export interface InlineImage {
  mimeType: string;
  /** Contenu de l'image encodé en base64 (sans préfixe `data:`). */
  data: string;
}

export interface InspirationAnalysis {
  /** Compte rendu rédigé du contenu de la publication. */
  summary: string;
  /** Lieux détectés, avec adresse quand elle est connue. */
  places: ExtractedPlace[];
  /** Mots-clés thématiques (sans le `#`), utiles pour nourrir les voyages. */
  tags: string[];
}

export type AnalysisErrorReason = 'missing_key' | 'blocked' | 'api_error' | 'bad_response';

export class AnalysisError extends Error {
  readonly reason: AnalysisErrorReason;

  constructor(reason: AnalysisErrorReason, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'AnalysisError';
  }
}

export const ANALYSIS_SYSTEM_PROMPT = `Tu es un assistant de voyage. On te donne le contenu d'une publication TikTok ou Instagram : sa légende et une ou plusieurs images d'aperçu.

Ta tâche :
1. Rédige un compte rendu clair et concis (3 à 6 phrases, en français) de ce que montre ou raconte la publication.
2. Identifie les lieux mentionnés ou visibles (restaurants, monuments, villes, points d'intérêt, hébergements...). Pour chaque lieu :
   - "name" : le nom du lieu.
   - "address" : l'adresse postale complète SEULEMENT si tu la connais avec une confiance raisonnable. Sinon null. N'invente jamais une adresse.
   - "city" et "country" : renseigne-les quand tu peux les déduire, sinon null.
   - "description" : une phrase expliquant l'intérêt du lieu pour un voyageur, sinon null.
   - "category" : classe le lieu dans EXACTEMENT une de ces valeurs : "restaurant" (restaurant, bar, café, street-food), "hotel" (hôtel, hébergement), "activité" (monument, musée, parc, visite, point d'intérêt). Si rien ne correspond, "autre".
3. "tags" : 3 à 8 mots-clés thématiques en minuscules, sans le caractère #.

Si aucun lieu n'est identifiable, renvoie une liste "places" vide. Réponds uniquement avec le JSON demandé.`;

/** Texte utilisateur à partir de la légende (ou consigne de repli sur les images). */
export const buildUserText = (caption: string | null): string =>
  caption
    ? `Légende de la publication :\n"""${caption}"""`
    : "La publication n'a pas de légende exploitable : appuie-toi sur les images.";

const REQUEST_TIMEOUT_MS = 30_000;
// Les modèles renvoient par moments un 429/500/503 (pic de charge) : on retente
// quelques fois avec un backoff court avant d'abandonner.
const MAX_ATTEMPTS = 4;
const RETRY_STATUSES = new Set([429, 500, 503]);
const RETRY_BASE_DELAY_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST JSON avec timeout et retry sur statuts transitoires. Renvoie la réponse `ok`,
 * ou lève une `AnalysisError('api_error')`. `label` sert à contextualiser les messages.
 */
export const postWithRetry = async (
  url: string,
  init: { headers: Record<string, string>; body: string },
  label: string,
): Promise<Response> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: init.headers,
        body: init.body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      if (attempt === MAX_ATTEMPTS) {
        throw new AnalysisError('api_error', `${label} request failed (network/timeout).`);
      }
      await sleep(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    if (response.ok) return response;

    if (RETRY_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
      await response.body?.cancel().catch(() => {});
      await sleep(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    const detail = await response.text().catch(() => '');
    throw new AnalysisError(
      'api_error',
      `${label} responded ${response.status}: ${detail.slice(0, 300)}`,
    );
  }

  throw new AnalysisError('api_error', `${label} is temporarily unavailable (high demand).`);
};

/**
 * Parse et normalise la réponse JSON du modèle en `InspirationAnalysis`.
 * Tolérant : ignore les champs manquants/mal typés plutôt que de tout rejeter, mais
 * lève une `AnalysisError('bad_response')` si la sortie est inexploitable.
 */
export const parseAnalysis = (text: string, label: string): InspirationAnalysis => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AnalysisError('bad_response', `${label} output is not valid JSON.`);
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new AnalysisError('bad_response', `${label} output has an unexpected shape.`);
  }

  const obj = raw as Record<string, unknown>;
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';

  const places: ExtractedPlace[] = Array.isArray(obj.places)
    ? obj.places
        .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
        .map((p) => ({
          name: typeof p.name === 'string' ? p.name.trim() : '',
          address: typeof p.address === 'string' && p.address.trim() ? p.address.trim() : null,
          city: typeof p.city === 'string' && p.city.trim() ? p.city.trim() : null,
          country: typeof p.country === 'string' && p.country.trim() ? p.country.trim() : null,
          description:
            typeof p.description === 'string' && p.description.trim() ? p.description.trim() : null,
          category: coerceCategory(p.category),
        }))
        .filter((p) => p.name.length > 0)
    : [];

  const tags: string[] = Array.isArray(obj.tags)
    ? [
        ...new Set(
          obj.tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim().replace(/^#/, '').toLowerCase())
            .filter(Boolean),
        ),
      ]
    : [];

  if (!summary && places.length === 0) {
    throw new AnalysisError('bad_response', `${label} output is empty.`);
  }

  return { summary, places, tags };
};

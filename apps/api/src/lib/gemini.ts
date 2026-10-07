/**
 * Client Gemini (Google AI Studio) pour l'analyse d'inspiration.
 *
 * Endpoint REST, sortie JSON structurée. Le socle commun (types, erreur, prompt,
 * parsing, retry) vit dans `aiAnalysis.ts` ; ici on ne garde que les spécificités
 * Gemini : l'URL, le format des `parts` et le `responseSchema` (types en MAJUSCULES).
 */

import { env } from '../env.js';
import {
  AnalysisError,
  ANALYSIS_SYSTEM_PROMPT,
  buildUserText,
  parseAnalysis,
  postWithRetry,
  type InlineImage,
  type InspirationAnalysis,
} from './aiAnalysis.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const LABEL = 'Gemini';

// Schéma OpenAPI (sous-ensemble accepté par l'API Gemini) : les types sont en MAJUSCULES.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    places: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          address: { type: 'STRING', nullable: true },
          city: { type: 'STRING', nullable: true },
          country: { type: 'STRING', nullable: true },
          description: { type: 'STRING', nullable: true },
          category: { type: 'STRING', enum: ['restaurant', 'hotel', 'activité', 'autre'] },
        },
        required: ['name'],
        propertyOrdering: ['name', 'address', 'city', 'country', 'description', 'category'],
      },
    },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'places', 'tags'],
  propertyOrdering: ['summary', 'places', 'tags'],
} as const;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
}

/** Analyse une publication (légende + images d'aperçu) via Gemini. */
export const analyzeInspiration = async ({
  caption,
  images,
}: {
  caption: string | null;
  images: InlineImage[];
}): Promise<InspirationAnalysis> => {
  if (!env.GEMINI_API_KEY) {
    throw new AnalysisError('missing_key', 'GEMINI_API_KEY is not configured.');
  }

  const parts: GeminiPart[] = [
    { text: buildUserText(caption) },
    ...images.map((image) => ({
      inlineData: { mimeType: image.mimeType, data: image.data },
    })),
  ];

  const response = await postWithRetry(
    `${API_BASE}/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ANALYSIS_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    },
    LABEL,
  );

  const payload = (await response.json().catch(() => null)) as GeminiResponse | null;

  if (payload?.promptFeedback?.blockReason) {
    throw new AnalysisError('blocked', `Content blocked: ${payload.promptFeedback.blockReason}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
  if (!text) {
    throw new AnalysisError('bad_response', 'Gemini returned no usable content.');
  }

  return parseAnalysis(text, LABEL);
};

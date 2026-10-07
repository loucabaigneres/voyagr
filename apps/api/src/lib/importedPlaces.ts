/**
 * Lieux importés depuis les inspirations, stockés comme lignes `discovery_content`
 * rattachées à un utilisateur (`ownerUserId`) et `isActive=false` : invisibles du feed
 * de découverte et de la génération, ils ne servent qu'au remplacement d'activités.
 *
 * Déduplication : un lieu a une URL synthétique stable `imported:<userId>:<clé>`, où la
 * clé est normalisée (nom + ville). Réanalyser la même vidéo, ou une autre vidéo sur le
 * même lieu, retombe sur la même ligne — on enrichit alors sa description au lieu d'en
 * créer une seconde.
 */

import type { ExtractedPlace, PlaceCategory } from '@voyagr/database';
import { sql } from 'drizzle-orm';
import type { Context } from '../trpc/context.js';
import { discoveryContent } from './tables.js';

const stripDiacritics = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const slug = (value: string) =>
  stripDiacritics(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Clé de dédup : nom + ville normalisés (minuscule, sans accents ni ponctuation). */
export const normalizePlaceKey = (name: string, city: string | null): string =>
  `${slug(name)}|${slug(city ?? '')}`;

export const importedPlaceUrl = (userId: string, key: string): string =>
  `imported:${userId}:${key}`;

/**
 * Crée (ou retrouve) l'élément lieu d'un utilisateur et renvoie son id `discovery_content`.
 * Idempotent : appelable à l'analyse comme à l'ajout au voyage. Renvoie `null` si le lieu
 * n'a pas de nom exploitable.
 */
export async function upsertImportedPlace(
  db: Context['db'],
  userId: string,
  place: ExtractedPlace,
  previewImageUrl?: string | null,
): Promise<string | null> {
  if (!slug(place.name)) return null;

  const url = importedPlaceUrl(userId, normalizePlaceKey(place.name, place.city));
  const category: PlaceCategory = place.category ?? 'autre';

  const [row] = await db
    .insert(discoveryContent)
    .values({
      url,
      ownerUserId: userId,
      mainMediaUrl: previewImageUrl ?? '',
      locationName: place.name,
      title: place.name,
      description: place.description,
      country: place.country,
      city: place.city,
      tags: { category },
      isActive: false,
    })
    .onConflictDoUpdate({
      target: discoveryContent.url,
      set: {
        // Enrichissement : on ajoute la nouvelle précision si elle n'est pas déjà présente.
        description: sql`CASE
          WHEN ${discoveryContent.description} IS NULL THEN excluded.description
          WHEN excluded.description IS NULL THEN ${discoveryContent.description}
          WHEN position(excluded.description in ${discoveryContent.description}) > 0 THEN ${discoveryContent.description}
          ELSE ${discoveryContent.description} || E'\n\n' || excluded.description END`,
        // On complète les champs manquants sans écraser ce qui est déjà renseigné.
        city: sql`coalesce(${discoveryContent.city}, excluded.city)`,
        country: sql`coalesce(${discoveryContent.country}, excluded.country)`,
        locationName: sql`coalesce(${discoveryContent.locationName}, excluded.location_name)`,
        mainMediaUrl: sql`coalesce(nullif(${discoveryContent.mainMediaUrl}, ''), excluded.main_media_url)`,
        tags: sql`coalesce(${discoveryContent.tags}, excluded.tags)`,
      },
    })
    .returning({ id: discoveryContent.id });

  return row?.id ?? null;
}

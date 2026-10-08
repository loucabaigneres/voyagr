import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { platformEnum, processingStatus, swipeDirectionEnum } from '../enums.js';

export type DiscoveryTags = {
  category?: string;
  subcategory?: string[];
  [key: string]: unknown;
};

/** Catégories alignées sur le système d'itinéraire (remplacement par catégorie). */
export type PlaceCategory = 'restaurant' | 'hotel' | 'activité' | 'autre';

/**
 * Lieu extrait d'une publication par l'analyse IA. L'adresse est « best-effort » :
 * renseignée seulement quand le modèle la connaît avec une confiance raisonnable,
 * sinon on se contente de la ville / du pays.
 */
export type ExtractedPlace = {
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  // Catégorie déduite par l'IA, pour rattacher le lieu au bon « bucket » de remplacement.
  category: PlaceCategory | null;
};

export const importedInspiration = pgTable('imported_inspiration', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  platform: platformEnum('platform').notNull(),
  originalUrl: text('original_url').notNull(),
  // Légende brute de la publication, telle que récupérée (ou collée à la main).
  description: text('description'),
  extracted_location: text('extracted_location').notNull(),
  extracted_tags: jsonb('extracted_tags').notNull(),
  // Compte rendu rédigé par l'IA à partir du contenu (légende + image d'aperçu).
  report: text('report'),
  // Type global de la publication, déduit par l'IA (sert au filtre par type).
  type: text('type').$type<PlaceCategory>(),
  // Ville principale de la publication, déduite par l'IA.
  city: text('city'),
  // Lieux détectés, avec leur adresse quand elle est connue. Voir `ExtractedPlace`.
  places: jsonb('places').$type<ExtractedPlace[]>(),
  status: processingStatus('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const discoveryContent = pgTable('discovery_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull().unique(),
  // Lieu importé depuis une inspiration : rattaché à un utilisateur. `null` = catalogue
  // global. Les lignes importées restent `isActive=false` pour rester hors du feed de
  // découverte et de la génération d'itinéraire ; elles ne servent qu'au remplacement.
  ownerUserId: text('owner_user_id'),
  mainMediaUrl: text('main_media_url').notNull(),
  carousselUrls: text('caroussel_urls').array(),
  locationName: text('location_name'),
  title: text('title'),
  description: text('description'),
  country: text('country'),
  city: text('city'),
  coordinates: text('coordinates'),
  tags: jsonb('tags').$type<DiscoveryTags>(),
  isActive: boolean('is_active').default(true),
});

export const swipes = pgTable(
  'swipe',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    discoveryContentId: uuid('discovery_content_id')
      .references(() => discoveryContent.id)
      .notNull(),
    direction: swipeDirectionEnum('direction').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('user_swipe_idx').on(table.userId, table.discoveryContentId)],
);

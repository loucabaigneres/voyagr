import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
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

// Groupe d'organisation des inspirations, propre à un utilisateur.
export const inspirationGroup = pgTable('inspiration_group', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
  // Lieux détectés, avec leur adresse quand elle est connue. Voir `ExtractedPlace`.
  places: jsonb('places').$type<ExtractedPlace[]>(),
  status: processingStatus('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Appartenance d'une inspiration à un groupe (relation N-N : une inspiration peut être
// dans plusieurs groupes). Les suppressions en cascade retirent l'appartenance quand
// l'inspiration ou le groupe disparaît.
export const inspirationGroupMember = pgTable(
  'inspiration_group_member',
  {
    inspirationId: uuid('inspiration_id')
      .notNull()
      .references(() => importedInspiration.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => inspirationGroup.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.inspirationId, table.groupId] })],
);

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

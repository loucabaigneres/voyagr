import { pgEnum } from 'drizzle-orm/pg-core';

export const platformEnum = pgEnum('platform', ['tiktok', 'instagram', 'other']);
export const processingStatus = pgEnum('processing_status', ['pending', 'analyzed', 'failed']);
export const swipeDirectionEnum = pgEnum('swipe_direction', ['like', 'dislike']);
export const tripStatusEnum = pgEnum('trip_status', ['draft', 'finalized', 'archived']);
export const tripIntensityEnum = pgEnum('trip_intensity', ['chill', 'balanced', 'intense']);
export const averagePriceEnum = pgEnum('average_price', ['budget', 'mid', 'premium']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);
export const documentTypeEnum = pgEnum('document_type', ['free_summary', 'premium_guide']);

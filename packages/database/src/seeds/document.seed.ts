import { generatedDocument } from '../schemas/document.js';
import { TRIP_ID } from './trip.seed.js';

export async function seedDocuments(db: ReturnType<typeof import('../index.js').createClient>) {
  await db
    .insert(generatedDocument)
    .values([
      {
        tripId: TRIP_ID,
        s3ObjectKey: 'documents/trips/weekend-paris-guide.pdf',
        version: 1,
        docType: 'premium_guide',
      },
    ])
    .onConflictDoNothing();
}

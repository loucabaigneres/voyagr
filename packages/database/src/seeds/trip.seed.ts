import { trip, tripDay, activity } from '../schemas/trip.js';
import { FAKE_USER_ID, DISCOVERY_CONTENT_ID } from './inspiration.seed.js';

export const TRIP_ID = '22222222-2222-2222-2222-222222222222';
export const TRIP_DAY_ID = '33333333-3333-3333-3333-333333333333';

export async function seedTrips(db: ReturnType<typeof import('../index.js').createClient>) {
  await db
    .insert(trip)
    .values([
      {
        id: TRIP_ID,
        userId: FAKE_USER_ID,
        title: 'Weekend à Paris',
        destination: 'Paris, France',
        startDate: '2026-06-15',
        endDate: '2026-06-18',
        status: 'draft',
        isPremium: false,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(tripDay)
    .values([
      {
        id: TRIP_DAY_ID,
        tripId: TRIP_ID,
        dayIndex: 1,
        targetDate: '2026-06-15',
        summary: 'Arrivée et visite du centre historique',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(activity)
    .values([
      {
        tripDayId: TRIP_DAY_ID,
        discoveryContentId: DISCOVERY_CONTENT_ID,
        title: 'Visite de la Tour Eiffel',
        description: 'Monter au 2ème étage au coucher du soleil',
        startTime: '18:00:00',
        endTime: '20:00:00',
        locationName: 'Tour Eiffel',
        coordinates: 'POINT(2.2945 48.8584)',
        estimatedCost: '30.00',
        orderIndex: 1,
      },
    ])
    .onConflictDoNothing();
}

/* eslint-disable no-console */

import 'dotenv/config';
import { createClient } from '../index.js';
import { seedInspirations } from './inspiration.seed.js';
import { seedTrips } from './trip.seed.js';
import { seedPayments } from './payment.seed.js';
import { seedDocuments } from './document.seed.js';

const db = createClient(process.env.DATABASE_URL!);

async function main() {
  console.log('🌱 Beginning global database seeding...\n');

  try {
    await seedInspirations(db);
    await seedTrips(db);
    await seedPayments(db);
    await seedDocuments(db);

    console.log('\n✅ Global database seeding completed successfully !');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  }
}

main();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as enums from './enums.js';
import * as inspiration from './schemas/inspiration.js';
import * as trip from './schemas/trip.js';
import * as payment from './schemas/payment.js';
import * as document from './schemas/document.js';

export const schema = {
  ...enums,
  ...inspiration,
  ...trip,
  ...payment,
  ...document,
};

export const createClient = (connectionString: string) => {
  const client = postgres(connectionString);
  return drizzle({ client, schema });
};

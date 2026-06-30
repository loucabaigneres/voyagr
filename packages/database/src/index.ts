import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as enums from './enums.js';
import * as auth from './schemas/auth.js';
import * as document from './schemas/document.js';
import * as inspiration from './schemas/inspiration.js';
import * as payment from './schemas/payment.js';
import * as trip from './schemas/trip.js';

export { loadDiscoveryData, type DiscoveryContentData } from './data.js';

export { loadDiscoveryData, type DiscoveryContentData } from './data.js';

export const schema = {
  ...enums,
  ...auth,
  ...document,
  ...inspiration,
  ...payment,
  ...trip,
};

export const createClient = (connectionString: string) => {
  const client = postgres(connectionString);
  return drizzle({ client, schema });
};

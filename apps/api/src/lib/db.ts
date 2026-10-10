import { createClient } from '@voyagr/database';
import { env } from '../env.js';

export const db = createClient(env.DATABASE_URL);

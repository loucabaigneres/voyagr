import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { InferSelectModel } from 'drizzle-orm';
import type { discoveryContent } from './schemas/inspiration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE_PATH = path.resolve(__dirname, '../data.json');

export type DiscoveryContentData = InferSelectModel<typeof discoveryContent>;

let cache: DiscoveryContentData[] | null = null;

/**
 * Loads the discovery catalog straight from `data.json` (the same file the
 * seed uses), so consumers don't need a running database. Parsed once and
 * cached for the process lifetime.
 */
export function loadDiscoveryData(): DiscoveryContentData[] {
  if (cache) return cache;
  const raw = readFileSync(DATA_FILE_PATH, 'utf-8');
  cache = JSON.parse(raw) as DiscoveryContentData[];
  return cache;
}

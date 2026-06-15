import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE_PATH = path.resolve(__dirname, '../data.json');

export interface DiscoveryContentData {
  id: string;
  locationName: string;
  url: string;
  mainMediaUrl: string;
  carousselUrls: string[];
  description: string;
  coordinates: string;
  country: string;
  city: string;
  tags: {
    category?: string;
    subcategory?: string[];
    [key: string]: unknown;
  };
  isActive: boolean;
}

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

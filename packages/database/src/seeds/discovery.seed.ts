import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { discoveryContent } from '../schemas/inspiration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE_PATH = path.resolve(__dirname, '../../data.json');

interface DiscoveryContentSeedItem {
  id: string;
  locationName: string;
  url: string;
  mainMediaUrl: string;
  carousselUrls: string[];
  description: string;
  coordinates: string;
  country: string;
  city: string;
  tags: unknown;
  isActive: boolean;
}

export async function seedDiscoveryContent(
  db: ReturnType<typeof import('../index.js').createClient>,
) {
  let raw: string;

  try {
    raw = readFileSync(DATA_FILE_PATH, 'utf-8');
  } catch {
    console.warn(`⚠️  ${DATA_FILE_PATH} not found, skipping discovery content import.`);
    return;
  }

  const items: DiscoveryContentSeedItem[] = JSON.parse(raw);

  const values = items.map((item) => ({
    url: item.url,
    mainMediaUrl: item.mainMediaUrl,
    carousselUrls: item.carousselUrls,
    locationName: item.locationName,
    description: item.description,
    country: item.country,
    city: item.city,
    coordinates: item.coordinates,
    tags: item.tags,
    isActive: item.isActive,
  }));

  await db
    .insert(discoveryContent)
    .values(values)
    .onConflictDoNothing({ target: discoveryContent.url });
}

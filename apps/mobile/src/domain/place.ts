import { categoryColors } from '@/theme/tokens';

/** Category values as stored in the catalogue (`discovery_content.tags.category`). */
export type PlaceCategory = 'hotel' | 'activité' | 'restaurant';

export interface CategoryMeta {
  label: string;
  /** "un autre restaurant" — used when offering a replacement. */
  another: string;
  colors: (typeof categoryColors)[keyof typeof categoryColors];
}

const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  hotel: {
    label: 'Hébergement',
    another: 'un autre hébergement',
    colors: categoryColors.hotel,
  },
  activité: {
    label: 'Activité',
    another: 'une autre activité',
    colors: categoryColors.activity,
  },
  restaurant: {
    label: 'Restaurant',
    another: 'un autre restaurant',
    colors: categoryColors.restaurant,
  },
};

export function isPlaceCategory(value: unknown): value is PlaceCategory {
  return typeof value === 'string' && value in CATEGORY_META;
}

/** Display info for any category value, with a neutral fallback for unknown ones. */
export function categoryMeta(category: string | null | undefined): CategoryMeta {
  if (isPlaceCategory(category)) return CATEGORY_META[category];
  return {
    label: category || 'Lieu',
    another: 'un autre lieu',
    colors: categoryColors.other,
  };
}

/** Strips the markdown emphasis the catalogue descriptions sometimes contain. */
export function cleanDescription(description: string | null | undefined): string {
  return (description ?? '').replace(/\*+/g, '').trim();
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Parses a PostGIS WKT point, `POINT(lng lat)`. Returns null when absent or malformed. */
export function parseWktPoint(wkt: string | null | undefined): LatLng | null {
  if (!wkt) return null;
  const match = wkt.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);
  if (!match) return null;

  const longitude = Number(match[1]);
  const latitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** Main photo first, then the carousel, without duplicates or empty values. */
export function placePhotos(place: {
  mainMediaUrl: string | null;
  carousselUrls?: string[] | null;
}): string[] {
  const urls = [place.mainMediaUrl, ...(place.carousselUrls ?? [])];
  return [...new Set(urls.filter((url): url is string => !!url))];
}

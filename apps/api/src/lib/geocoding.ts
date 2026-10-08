/**
 * Géocodage d'adresses via Nominatim (OpenStreetMap). Gratuit, sans clé, mais avec une
 * politique d'usage stricte : User-Agent identifiable et ~1 requête/seconde. On l'utilise
 * ponctuellement (à l'import d'une inspiration) et on met les coordonnées en cache dans
 * `discovery_content.coordinates`, donc le volume reste faible.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'VoyagrBot/1.0 (inspiration geocoding)';
const FETCH_TIMEOUT_MS = 8000;

export interface GeoCoord {
  lat: number;
  lng: number;
}

/** Résout une adresse en coordonnées. `null` si rien trouvé ou en cas d'erreur réseau. */
export const geocodeAddress = async (address: string): Promise<GeoCoord | null> => {
  const query = address.trim();
  if (!query) return null;

  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const data = (await response.json().catch(() => null)) as Array<{
      lat?: string;
      lon?: string;
    }> | null;
    const hit = data?.[0];
    if (!hit?.lat || !hit?.lon) return null;

    const lat = Number.parseFloat(hit.lat);
    const lng = Number.parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
};

/** Format WKT attendu par le reste de l'app (cf. `parseWkt`) : `POINT(lng lat)`. */
export const toWktPoint = (coord: GeoCoord): string => `POINT(${coord.lng} ${coord.lat})`;

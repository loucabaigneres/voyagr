import { eq, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { db } from '../lib/db.js';
import { discoveryContent } from '../lib/tables.js';

/**
 * Streams catalog images through the API.
 *
 * Most of the sites we link to (GetYourGuide, restaurant pages, hotel sites)
 * serve their pictures without an `Access-Control-Allow-Origin` header, so the
 * browser refuses to hand them to the PDF renderer. Fetching server-side sidesteps
 * CORS entirely.
 *
 * The requested URL must already exist in `discovery_content`, which keeps this
 * from becoming an open relay: a caller cannot point it at an arbitrary host,
 * only at pictures the catalog already references.
 */

/** Abort slow origins rather than tying up a connection. */
const FETCH_TIMEOUT_MS = 8_000;
/** Catalog thumbnails are small; anything bigger is not something we want to relay. */
const MAX_BYTES = 5 * 1024 * 1024;

async function isKnownImageUrl(url: string): Promise<boolean> {
  const [row] = await db
    .select({ id: discoveryContent.id })
    .from(discoveryContent)
    .where(
      or(
        eq(discoveryContent.mainMediaUrl, url),
        // `caroussel_urls` is a Postgres text[], not jsonb.
        sql`${discoveryContent.carousselUrls} @> ARRAY[${url}]::text[]`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export function registerImageProxy(server: FastifyInstance) {
  server.get<{ Querystring: { url?: string } }>('/image-proxy', async (request, reply) => {
    const raw = request.query.url;
    if (!raw) return reply.status(400).send({ error: 'Paramètre "url" manquant.' });

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return reply.status(400).send({ error: 'URL invalide.' });
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return reply.status(400).send({ error: 'Protocole non supporté.' });
    }

    if (!(await isKnownImageUrl(raw))) {
      return reply.status(403).send({ error: 'Cette image ne fait pas partie du catalogue.' });
    }

    let upstream: Response;
    try {
      upstream = await fetch(raw, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        // Some CDNs reject requests without a browser-ish UA.
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoyagrBot/1.0)' },
        redirect: 'follow',
      });
    } catch {
      return reply.status(502).send({ error: "Impossible de récupérer l'image." });
    }

    if (!upstream.ok) {
      return reply.status(502).send({ error: `Source indisponible (${upstream.status}).` });
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return reply.status(415).send({ error: 'La ressource cible n’est pas une image.' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return reply.status(413).send({ error: 'Image trop volumineuse.' });
    }

    return reply
      .header('Content-Type', contentType)
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'public, max-age=86400')
      .send(buffer);
  });
}

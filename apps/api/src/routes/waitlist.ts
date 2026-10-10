import type { FastifyInstance } from 'fastify';
import * as z from 'zod';

import { db } from '../lib/db.js';
import { waitlistSubscriber } from '../lib/tables.js';

/**
 * Collects e-mail sign-ups from the mobile-app teaser landing page
 * (`apps/landing-page`) into the `waitlist_subscriber` table.
 *
 * Public on purpose: visitors are not authenticated. The e-mail column is
 * unique, so re-submitting the same address is a no-op (idempotent) rather
 * than an error — the caller always gets a success response.
 */

const bodySchema = z.object({
  email: z.email('Adresse e-mail invalide.').max(254),
  source: z.string().max(64).optional(),
});

export function registerWaitlist(server: FastifyInstance) {
  server.post('/waitlist', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Adresse e-mail invalide.' });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const source = parsed.data.source ?? 'landing-page';

    try {
      await db
        .insert(waitlistSubscriber)
        .values({ email, source })
        // Same address twice -> keep the first sign-up, report success anyway.
        .onConflictDoNothing({ target: waitlistSubscriber.email });
    } catch (error) {
      server.log.error(error, 'Waitlist sign-up failed');
      return reply.status(500).send({ error: "L'inscription a échoué." });
    }

    return reply.status(201).send({ success: true });
  });
}

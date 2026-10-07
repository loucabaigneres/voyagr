import crypto from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { activity, trip, tripDay, tripMembers, user } from '@voyagr/database';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../init.js';

function generateInvitePayload() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789_--__--_';
  let inviteCode = '';
  const bytes = crypto.randomBytes(8);

  for (let i = 0; i < 8; i++) {
    inviteCode += chars[bytes[i]! % chars.length];
  }

  if (!inviteCode.includes('-') && !inviteCode.includes('_')) {
    const pos = crypto.randomInt(0, 8);
    const sep = crypto.randomInt(0, 2) === 0 ? '-' : '_';
    inviteCode = inviteCode.substring(0, pos) + sep + inviteCode.substring(pos + 1);
  }

  const inviteCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { inviteCode, inviteCodeExpiresAt };
}

export const groupRouter = createTRPCRouter({
  createOrConvertGroupTrip: protectedProcedure
    .input(
      z
        .object({
          tripId: z.uuid().optional(),
          destination: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { inviteCode, inviteCodeExpiresAt } = generateInvitePayload();

      if (input?.tripId) {
        const existingTrip = await ctx.db.query.trip.findFirst({
          where: (t, { eq }) => eq(t.id, input.tripId!),
        });

        if (!existingTrip) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Voyage introuvable.' });
        }

        if (existingTrip.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
        }

        const [updatedTrip] = await ctx.db
          .update(trip)
          .set({
            isGroup: true,
            inviteCode,
            inviteCodeExpiresAt,
            destination: input.destination ?? existingTrip.destination,
            updatedAt: new Date(),
          })
          .where(eq(trip.id, input.tripId))
          .returning();

        const membership = await ctx.db.query.tripMembers.findFirst({
          where: (tm, { and, eq }) =>
            and(eq(tm.tripId, updatedTrip.id), eq(tm.userId, ctx.user.id)),
        });

        if (!membership) {
          await ctx.db.insert(tripMembers).values({
            tripId: updatedTrip.id,
            userId: ctx.user.id,
            role: 'owner',
          });
        }

        return {
          tripId: updatedTrip.id,
          inviteCode: updatedTrip.inviteCode,
          inviteCodeExpiresAt: updatedTrip.inviteCodeExpiresAt,
          destination: updatedTrip.destination,
        };
      }

      const [newTrip] = await ctx.db
        .insert(trip)
        .values({
          userId: ctx.user.id,
          destination: input?.destination ?? 'Destination à définir',
          isGroup: true,
          inviteCode,
          inviteCodeExpiresAt,
          status: 'draft',
        })
        .returning();

      await ctx.db.insert(tripMembers).values({
        tripId: newTrip.id,
        userId: ctx.user.id,
        role: 'owner',
      });

      return {
        tripId: newTrip.id,
        inviteCode: newTrip.inviteCode,
        inviteCodeExpiresAt: newTrip.inviteCodeExpiresAt,
        destination: newTrip.destination,
      };
    }),

  regenerateInviteCode: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.query.tripMembers.findFirst({
        where: (tm, { and, eq }) => and(eq(tm.tripId, input.tripId), eq(tm.userId, ctx.user.id)),
      });

      if (!membership || membership.role !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seul l’organisateur peut régénérer le code.',
        });
      }

      const { inviteCode, inviteCodeExpiresAt } = generateInvitePayload();

      const [updatedTrip] = await ctx.db
        .update(trip)
        .set({ inviteCode, inviteCodeExpiresAt, updatedAt: new Date() })
        .where(eq(trip.id, input.tripId))
        .returning();

      return {
        inviteCode: updatedTrip.inviteCode,
        inviteCodeExpiresAt: updatedTrip.inviteCodeExpiresAt,
      };
    }),

  updateDestination: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        destination: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.query.tripMembers.findFirst({
        where: (tm, { and, eq }) => and(eq(tm.tripId, input.tripId), eq(tm.userId, ctx.user.id)),
      });

      if (!membership) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé au voyage.' });
      }

      await ctx.db
        .update(trip)
        .set({ destination: input.destination, updatedAt: new Date() })
        .where(eq(trip.id, input.tripId));

      return { success: true, destination: input.destination };
    }),

  joinGroupTrip: protectedProcedure
    .input(z.object({ inviteCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const targetTrip = await ctx.db.query.trip.findFirst({
        where: (t, { eq }) => eq(t.inviteCode, input.inviteCode.toUpperCase()),
      });

      if (!targetTrip) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Code de voyage introuvable ou expiré.',
        });
      }

      if (
        !targetTrip.inviteCodeExpiresAt ||
        new Date(targetTrip.inviteCodeExpiresAt) < new Date()
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Ce lien d’invitation a expiré (validité 24 h). Demande à l’hôte d’en générer un nouveau.',
        });
      }

      const existingMember = await ctx.db.query.tripMembers.findFirst({
        where: (tm, { and, eq }) => and(eq(tm.tripId, targetTrip.id), eq(tm.userId, ctx.user.id)),
      });

      if (!existingMember) {
        await ctx.db.insert(tripMembers).values({
          tripId: targetTrip.id,
          userId: ctx.user.id,
          role: 'member',
        });
      }

      return {
        success: true,
        tripId: targetTrip.id,
      };
    }),

  getMyGroupTrips: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        inviteCode: trip.inviteCode,
        inviteCodeExpiresAt: trip.inviteCodeExpiresAt,
        status: trip.status,
        createdAt: trip.createdAt,
        role: tripMembers.role,
      })
      .from(tripMembers)
      .innerJoin(trip, eq(tripMembers.tripId, trip.id))
      .where(and(eq(tripMembers.userId, ctx.user.id), eq(trip.isGroup, true)))
      .orderBy(desc(trip.createdAt));
  }),

  getGroupMembers: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: tripMembers.role,
          joinedAt: tripMembers.joinedAt,
        })
        .from(tripMembers)
        .innerJoin(user, eq(tripMembers.userId, user.id))
        .where(eq(tripMembers.tripId, input.tripId));
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const callerMembership = await ctx.db.query.tripMembers.findFirst({
        where: (tm, { and, eq }) => and(eq(tm.tripId, input.tripId), eq(tm.userId, ctx.user.id)),
      });

      if (!callerMembership || callerMembership.role !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seul le propriétaire du voyage peut supprimer des membres.',
        });
      }

      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'L’organisateur ne peut pas s’auto-exclure.',
        });
      }

      await ctx.db
        .delete(tripMembers)
        .where(and(eq(tripMembers.tripId, input.tripId), eq(tripMembers.userId, input.userId)));

      return { success: true };
    }),

  deleteGroupTrip: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const callerMembership = await ctx.db.query.tripMembers.findFirst({
        where: (tm, { and, eq }) => and(eq(tm.tripId, input.tripId), eq(tm.userId, ctx.user.id)),
      });

      if (!callerMembership || callerMembership.role !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seul l’organisateur peut supprimer ce voyage de groupe.',
        });
      }

      const days = await ctx.db
        .select({ id: tripDay.id })
        .from(tripDay)
        .where(eq(tripDay.tripId, input.tripId));

      const dayIds = days.map((d) => d.id);
      if (dayIds.length > 0) {
        await ctx.db.delete(activity).where(inArray(activity.tripDayId, dayIds));
        await ctx.db.delete(tripDay).where(eq(tripDay.tripId, input.tripId));
      }

      await ctx.db.delete(tripMembers).where(eq(tripMembers.tripId, input.tripId));
      await ctx.db.delete(trip).where(eq(trip.id, input.tripId));

      return { success: true };
    }),
});

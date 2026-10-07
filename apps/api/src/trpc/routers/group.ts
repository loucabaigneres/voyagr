import crypto from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { trip, tripMembers, user } from '@voyagr/database';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../init.js';

export const groupRouter = createTRPCRouter({
  createGroupTrip: protectedProcedure
    .input(
      z
        .object({
          destination: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      const [newTrip] = await ctx.db
        .insert(trip)
        .values({
          userId: ctx.user.id,
          destination: input?.destination ?? 'Destination à définir',
          isGroup: true,
          inviteCode,
          status: 'draft',
        })
        .returning({ id: trip.id, inviteCode: trip.inviteCode });

      await ctx.db.insert(tripMembers).values({
        tripId: newTrip.id,
        userId: ctx.user.id,
        role: 'owner',
      });

      return {
        success: true,
        tripId: newTrip.id,
        inviteCode: newTrip.inviteCode,
      };
    }),

  getMyGroupTrips: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        inviteCode: trip.inviteCode,
        status: trip.status,
        createdAt: trip.createdAt,
        role: tripMembers.role,
      })
      .from(tripMembers)
      .innerJoin(trip, eq(tripMembers.tripId, trip.id))
      .where(and(eq(tripMembers.userId, ctx.user.id), eq(trip.isGroup, true)))
      .orderBy(desc(trip.createdAt));
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
});

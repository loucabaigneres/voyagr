import { z } from 'zod';

export const tripFormSchema = z.object({
  destination: z.string().min(1),
  startDate: z.string().min(1),
  durationDays: z.number().min(1),
  numberOfPeople: z.number().min(1),
  ages: z.array(z.union([z.number(), z.object({ value: z.number() }).transform((o) => o.value)])),
  intensity: z.enum(['chill', 'balanced', 'intense']),
  averagePrice: z.enum(['budget', 'mid', 'premium']),
  interests: z.array(z.string()).optional().default([]),
  dietaryRestrictions: z
    .union([z.string(), z.array(z.string()).transform((arr) => arr.join(', '))])
    .optional()
    .nullable(),
  medicalConditions: z
    .union([z.string(), z.array(z.string()).transform((arr) => arr.join(', '))])
    .optional()
    .nullable(),
});

export type TripFormInput = z.infer<typeof tripFormSchema>;

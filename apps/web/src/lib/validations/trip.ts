import { z } from 'zod';

export const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Végétarien' },
  { id: 'vegan', label: 'Végan' },
  { id: 'gluten_free', label: 'Sans gluten' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Casher' },
] as const;

export const MEDICAL_OPTIONS = [
  { id: 'reduced_mobility', label: 'Mobilité réduite' },
  { id: 'pregnancy', label: 'Grossesse' },
  { id: 'asthma', label: 'Asthme / Problèmes respiratoires' },
  { id: 'vertigo', label: 'Vertige sévère' },
] as const;

export const tripFormSchema = z.object({
  destination: z.string().min(1, 'La destination est requise'),
  startDate: z.string().min(1, 'La date de départ est requise'),
  durationDays: z.number().min(1, 'La durée minimale est de 1 jour'),
  numberOfPeople: z.number().min(1, 'Au moins un voyageur requis'),
  ages: z.array(z.object({ value: z.number() })),
  intensity: z.enum(['chill', 'balanced', 'intense']),
  averagePrice: z.enum(['budget', 'mid', 'premium']),
  dietaryOptions: z.array(z.string()).default([]),
  dietaryCustom: z.string().optional(),
  medicalOptions: z.array(z.string()).default([]),
  medicalCustom: z.string().optional(),
});

export type TripFormValues = z.infer<typeof tripFormSchema>;

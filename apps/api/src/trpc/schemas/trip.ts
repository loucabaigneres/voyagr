import * as z from 'zod';

export const tripFormSchema = z.object({
  destination: z.string(),
  numberOfPeople: z.number().min(1, 'Il faut au moins une personne pour le voyage.'),
  ages: z.array(z.number()).min(1, "Renseignez l'âge de chaque personne."),
  startDate: z.string(),
  durationDays: z.number().min(1, 'Le voyage doit durer au moins 1 jour.'),
  averagePrice: z.enum(['budget', 'mid', 'premium']),
  dietaryRestrictions: z.string().optional(),
  medicalConditions: z.string().optional(),
  interests: z.array(z.string()).min(1, "Choisissez au moins 1 centre d'intérêt."),
  intensity: z.enum(['chill', 'balanced', 'intense']),
});

export type TripFormInput = z.infer<typeof tripFormSchema>;

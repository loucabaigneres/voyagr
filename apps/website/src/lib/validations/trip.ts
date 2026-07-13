import * as z from 'zod'

export const AVAILABLE_INTERESTS = [
  { id: 'culture', label: 'Musées & Culture' },
  { id: 'gastronomy', label: 'Gastronomie' },
  { id: 'nature', label: 'Nature & Paysages' },
  { id: 'adventure', label: 'Aventure & Sport' },
  { id: 'nightlife', label: 'Vie nocturne' },
]

export const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Végétarien' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten_free', label: 'Sans gluten' },
  { id: 'lactose_free', label: 'Sans lactose' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Casher' },
]

export const MEDICAL_OPTIONS = [
  { id: 'reduced_mobility', label: 'Mobilité réduite (PMR)' },
  { id: 'asthma', label: 'Asthme' },
  { id: 'diabetes', label: 'Diabète' },
  { id: 'severe_allergies', label: 'Allergies sévères' },
]

export const tripFormSchema = z.object({
  destination: z.string(),
  numberOfPeople: z.number().min(1, 'Il faut au moins 1 personne'),
  ages: z.array(z.object({ value: z.number().min(0, 'Âge invalide') })).min(1),
  startDate: z.string().min(1, 'La date de départ est requise'),
  durationDays: z.number().min(1, 'Minimum 1 jour'),
  averagePrice: z.enum(['budget', 'mid', 'premium']),
  intensity: z.enum(['chill', 'balanced', 'intense']),
  dietaryOptions: z.array(z.string()).default([]),
  dietaryCustom: z.string().optional(),
  medicalOptions: z.array(z.string()).default([]),
  medicalCustom: z.string().optional(),
  interests: z.array(z.string()).min(1, 'Choisissez au moins un intérêt'),
})

export type TripFormValues = z.infer<typeof tripFormSchema>

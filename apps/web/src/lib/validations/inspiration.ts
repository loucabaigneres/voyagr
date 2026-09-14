import * as z from 'zod';

// Miroir du schéma d'entrée de `inspiration.importFromUrl` côté API.
export const importInspirationSchema = z.object({
  url: z.url('Colle un lien valide (TikTok ou Instagram).'),
  caption: z.string().max(5000, 'La description est trop longue.').optional(),
});

export type ImportInspirationValues = z.infer<typeof importInspirationSchema>;

// Renvoyé par l'API quand la légende n'a pas pu être récupérée automatiquement.
export const CAPTION_UNAVAILABLE = 'CAPTION_UNAVAILABLE';

import * as z from 'zod';

export const importInspirationSchema = z.object({
  url: z.string().min(1, 'Le lien est requis.').url('Ce lien ne semble pas valide.'),
});

export type ImportInspirationValues = z.infer<typeof importInspirationSchema>;

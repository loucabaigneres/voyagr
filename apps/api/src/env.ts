import 'dotenv/config';
import * as z from 'zod';

// Define strict schema for environment variables
const envSchema = z.object({
  // Node configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number(),

  // Database configuration
  DATABASE_URL: z.url(),

  // Better Auth configuration
  BETTER_AUTH_SECRET: z.string().min(10, 'BETTER_AUTH_SECRET must be at least 10 characters long'),
  BETTER_AUTH_URL: z.url(),

  // Google OAuth configuration
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Frontend URL configuration
  FRONTEND_URL: z.url().default('http://localhost:5173'),

  // Google AI Studio (Gemini) — analyse des inspirations importées. Optionnel : sans clé,
  // la route d'analyse renvoie une erreur propre plutôt que d'empêcher le serveur de démarrer.
  GEMINI_API_KEY: z.string().min(1).optional(),
  // Alias stable maintenu par Google (pointe vers le Flash Lite courant). On évite un
  // identifiant figé comme `gemini-2.5-flash` (bloqué pour les nouveaux comptes) ; le
  // variant « lite » est le plus disponible et suffit pour l'extraction de lieux.
  GEMINI_MODEL: z.string().min(1).default('gemini-flash-lite-latest'),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Error parsing environment variables:');
  // Show detailed error messages for each invalid variable
  console.error(JSON.stringify(z.treeifyError(parsedEnv.error), null, 2));
  process.exit(1); // Exit with error code if validation fails
}

// Export the validated environment variables
export const env = parsedEnv.data;

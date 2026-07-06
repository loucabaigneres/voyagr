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
  FRONTEND_URL: z.url(),
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

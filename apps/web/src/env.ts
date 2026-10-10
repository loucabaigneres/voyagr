import * as z from 'zod';

// Define strict schema for environment variables
const envSchema = z.object({
  VITE_API_URL: z.url(),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  console.error('❌ Error parsing environment variables:');
  // Show detailed error messages for each invalid variable
  console.error(JSON.stringify(z.treeifyError(parsedEnv.error), null, 2));
  throw new Error('Invalid environment variables.');
}

// Export the validated environment variables
export const env = parsedEnv.data;

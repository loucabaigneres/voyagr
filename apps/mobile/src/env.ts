import * as z from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.url(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Error parsing environment variables:');
  console.error(JSON.stringify(z.treeifyError(parsedEnv.error), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;

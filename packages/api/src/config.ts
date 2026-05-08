import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  MSG91_API_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('BIZOS'),
  MSG91_TEMPLATE_ID: z.string().optional(),
  INTERAKT_API_KEY: z.string().optional(),
  INTERAKT_BASE_URL: z.string().url().default('https://api.interakt.ai/v1'),
  ENCRYPTION_KEY: z.string().min(64).optional(),
  SENTRY_DSN: z.string().optional(),
  API_URL: z.string().default('http://localhost:3001'),
  GEMINI_API_KEY: z.string().optional(),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment variables: ${missing}`);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;

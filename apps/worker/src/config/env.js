import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load root .env file as well as local .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/postpilot?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  PUBLISH_MODE: z.enum(['mock', 'live']).default('mock'),
  WORKER_CONCURRENCY: z.string().transform((v) => parseInt(v, 10)).default('5'),

  API_URL: z.string().url().default('http://localhost:4000'),
  POSTPILOT_API_KEY: z.string().min(16).default('pp_live_secret_n8n_scheduler_api_key_123456'),

  N8N_HMAC_SECRET: z.string().min(16).default('hmac_shared_secret_between_node_and_n8n_at_least_32_chars'),
  N8N_PUBLISH_RESULT_WEBHOOK_URL: z.string().url().default('http://localhost:5678/webhook/publish-result'),

  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Worker Environment validation failed:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;

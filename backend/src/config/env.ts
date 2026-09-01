import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required. Set it in backend/.env to a MongoDB connection string (e.g. mongodb+srv://... or mongodb://localhost:27017/brainarena).'),
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AI_PROVIDER: z.enum(['gemini', 'openai', 'mock', 'none']).default('none'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_TUNED_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  API_ORIGIN: z.string().default("http://localhost:4000"),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default("http://localhost:4000/auth/google/callback"),
  YANDEX_CLIENT_ID: z.string().optional().default(""),
  YANDEX_CLIENT_SECRET: z.string().optional().default(""),
  YANDEX_CALLBACK_URL: z
    .string()
    .default("http://localhost:4000/auth/yandex/callback"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export function oauthConfigured(env: Env) {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    yandex: Boolean(env.YANDEX_CLIENT_ID && env.YANDEX_CLIENT_SECRET),
  };
}

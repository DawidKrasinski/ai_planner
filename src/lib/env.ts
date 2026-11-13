import { z } from "zod";

const optionalUrl = z.url().optional().or(z.literal(""));

export const ServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal("")),
  DATABASE_URL: z.string().min(1).optional().or(z.literal("")),
  ALLOWED_EMAIL: z.email().optional().or(z.literal("")),
  CRON_SECRET: z.string().min(16).optional().or(z.literal("")),
  TOKEN_ENCRYPTION_KEY: z.string().min(1).optional().or(z.literal("")),
  AI_PROVIDER: z.enum(["openai", "anthropic", "mock"]).default("mock"),
  OPENAI_API_KEY: z.string().optional().or(z.literal("")),
  ANTHROPIC_API_KEY: z.string().optional().or(z.literal("")),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-4-5"),
  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal("")),
  GOOGLE_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  GOOGLE_REDIRECT_URI: optionalUrl,
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(source);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Nieprawidłowa konfiguracja środowiska: ${message}`);
  }
  return parsed.data;
}

export function isAuthConfigured(env: ServerEnv): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.ALLOWED_EMAIL);
}

export function isDatabaseConfigured(env: ServerEnv): boolean {
  return Boolean(env.DATABASE_URL);
}

export function isAiConfigured(env: ServerEnv): boolean {
  if (env.AI_PROVIDER === "mock") {
    return true;
  }
  if (env.AI_PROVIDER === "openai") {
    return Boolean(env.OPENAI_API_KEY);
  }
  return Boolean(env.ANTHROPIC_API_KEY);
}

export function isGoogleConfigured(env: ServerEnv): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

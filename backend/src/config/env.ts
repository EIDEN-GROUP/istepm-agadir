import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try common locations for .env / .env.production
const candidates = [
  path.resolve(__dirname, "..", "..", ".env"),
  path.resolve(process.cwd(), ".env"),
];
for (const c of candidates) {
  if (existsSync(c)) {
    dotenv.config({ path: c });
    break;
  }
}

const prodCandidates = [
  path.resolve(__dirname, "..", "..", ".env.production"),          // container: /app/
  path.resolve(__dirname, "..", "..", "..", ".env.production"),    // dev: monorepo root
  path.resolve(process.cwd(), ".env.production"),                  // cwd
  path.resolve(process.cwd(), "..", ".env.production"),            // parent of cwd
];
for (const c of prodCandidates) {
  if (existsSync(c)) {
    dotenv.config({ path: c, override: true });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@localhost:5432/school_crm"),

  JWT_SECRET: z.string().default("change-me-in-production"),
  JWT_EXPIRES_IN: z.string().default("12h"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_BUCKET: z.string().default("school-crm"),
  MINIO_USE_SSL: z.coerce.boolean().default(false),

  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  FROM_EMAIL: z.string().default("noreply@school-crm.com"),
  ADMIN_EMAIL: z.string().default("admin@school-crm.com"),

  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_ACCESS_TOKEN: z.string().default(""),
  WHATSAPP_API_VERSION: z.string().default("v22.0"),
  N8N_WEBHOOK_URL: z.string().default(""),
  N8N_WEBHOOK_SECRET: z.string().default(""),

  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .refine(
      (v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .every((s) => s !== "*" && /^(https:\/\/|http:\/\/localhost([/:]|$))/.test(s)),
      { message: "CORS_ORIGIN must not contain '*' and must be https:// or http://localhost" },
    ),

  /** Public frontend base URL for invitation links. Defaults to first CORS origin. */
  FRONTEND_URL: z.string().default(""),

  ADMIN_API_KEY: z.string().default("superadmin-secret-key-change-me"),

  /** Clé dédiée au flux tickets lu par le BMS (rotation indépendante). */
  FEATURE_TICKETS_API_KEY: z.string().default(""),

  AI_API_KEY: z.string().default(""),
  AI_BASE_URL: z.string().default("https://integrate.api.nvidia.com/v1"),
  AI_MODEL: z.string().default("meta/llama-3.1-8b-instruct"),

  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid environment variables:", result.error.flatten());
      process.exit(1);
    }
    // Fail closed: never boot production with predictable secrets.
    if (result.data.NODE_ENV === "production") {
      if (result.data.JWT_SECRET.length < 32 || result.data.JWT_SECRET.includes("change-me")) {
        console.error("FATAL: JWT_SECRET must be a strong random value (32+ chars) in production.");
        process.exit(1);
      }
      if (result.data.ADMIN_API_KEY.length < 16 || result.data.ADMIN_API_KEY.includes("change-me")) {
        console.error("FATAL: ADMIN_API_KEY must be set to a strong random value in production.");
        process.exit(1);
      }
    }
    _env = result.data;
  }
  return _env;
}

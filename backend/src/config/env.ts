import "dotenv/config";
import { z } from "zod";

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
  JWT_EXPIRES_IN: z.string().default("7d"),

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

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  ADMIN_API_KEY: z.string().default("superadmin-secret-key-change-me"),

  AI_API_KEY: z.string().default(""),
  AI_BASE_URL: z.string().default("https://integrate.api.nvidia.com/v1"),
  AI_MODEL: z.string().default("nvidia/qwen-qwen3.5-397b-a17b"),

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
    _env = result.data;
  }
  return _env;
}

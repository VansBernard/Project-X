import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_PUBLIC_KEY: z.string().min(1),
  PAYSTACK_BASE_URL: z.string().url().default("https://api.paystack.co"),
  PAYSTACK_MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  LICENSE_PRIVATE_KEY_PEM_BASE64: z.string().min(1),
  LICENSE_PUBLIC_KEY_PEM: z.string().min(1),
  LICENSE_KEY_ID: z.string().min(1).default("default"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  LICENSE_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5)
});

export const env = envSchema.parse(process.env);

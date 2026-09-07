import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
dotenv.config({ path: envPath });
dotenv.config();

const developmentPaymentLinkSecret = "development-payment-link-secret-change-before-production";

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
  WEB_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://127.0.0.1:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().url()).min(1)),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_PUBLIC_KEY: z.string().min(1),
  PAYSTACK_BASE_URL: z.string().url().default("https://api.paystack.co"),
  PAYMENT_PORTAL_BASE_URL: z.string().url().default("http://localhost:4000"),
  PAYMENT_LINK_SECRET: z.string().min(32).default(developmentPaymentLinkSecret),
  PAYSTACK_MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(10),
  LICENSE_PRIVATE_KEY_PEM_BASE64: z.string().min(1),
  LICENSE_PUBLIC_KEY_PEM: z.string().optional(),
  LICENSE_PUBLIC_KEY_PEM_BASE64: z.string().optional(),
  LICENSE_KEY_ID: z.string().min(1).default("default"),
  RECOVERY_PRIVATE_KEY_PEM_BASE64: z.string().optional(),
  RECOVERY_KEY_ID: z.string().min(1).default("recovery-2026"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  LICENSE_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5)
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && value.PAYMENT_LINK_SECRET === developmentPaymentLinkSecret) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PAYMENT_LINK_SECRET"],
      message: "PAYMENT_LINK_SECRET must be configured in production."
    });
  }

  if (value.NODE_ENV === "production") {
    const hasLocalOrigin = value.WEB_ORIGIN.some((origin) => /localhost|127\.0\.0\.1/.test(new URL(origin).hostname));
    if (hasLocalOrigin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WEB_ORIGIN"],
        message: "WEB_ORIGIN must not contain localhost origins in production."
      });
    }

    if (/localhost|127\.0\.0\.1/.test(new URL(value.PAYMENT_PORTAL_BASE_URL).hostname)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PAYMENT_PORTAL_BASE_URL"],
        message: "PAYMENT_PORTAL_BASE_URL must use a deployed host in production."
      });
    }

    if (!value.PAYSTACK_SECRET_KEY.startsWith("sk_live_") || !value.PAYSTACK_PUBLIC_KEY.startsWith("pk_live_")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PAYSTACK_SECRET_KEY"],
        message: "Production Paystack credentials must be live keys."
      });
    }

    if (!value.DATABASE_URL.includes("sslmode=require")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "Production DATABASE_URL must require TLS with sslmode=require."
      });
    }
  }

  if (!value.LICENSE_PUBLIC_KEY_PEM && !value.LICENSE_PUBLIC_KEY_PEM_BASE64) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["LICENSE_PUBLIC_KEY_PEM"],
      message: "Either LICENSE_PUBLIC_KEY_PEM or LICENSE_PUBLIC_KEY_PEM_BASE64 must be provided."
    });
  }
});

export const env = envSchema.parse(process.env);

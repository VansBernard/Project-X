import { z } from "zod";
import { LicenseStatus } from "@prisma/client";

const uuidSchema = z.string().uuid();
export const licenseTypeSchema = z.enum(["temporary", "permanent"]);

export const issueLicenseSchema = z
  .object({
    deviceId: uuidSchema,
    contractId: uuidSchema,
    licenseType: licenseTypeSchema.default("temporary"),
    expiresAt: z.coerce.date().optional(),
    preProvisioned: z.boolean().optional(),
    metadata: z.record(z.unknown()).default({})
  })
  .superRefine((value, ctx) => {
    if (value.licenseType === "temporary" && (!value.expiresAt || Number.isNaN(new Date(value.expiresAt).getTime()))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Temporary licenses require a future expiresAt value."
      });
    }

    if (value.expiresAt && new Date(value.expiresAt).getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "License expiration must be in the future."
      });
    }
  });

export const listLicensesSchema = z.object({
  take: z.coerce.number().int().min(1).max(250).optional(),
  cursor: uuidSchema.optional(),
  status: z.nativeEnum(LicenseStatus).optional(),
  deviceId: uuidSchema.optional(),
  contractId: uuidSchema.optional(),
  customerId: uuidSchema.optional()
});

export type ListLicensesQuery = z.infer<typeof listLicensesSchema>;

const signedLicensePayloadSchema = z
  .object({
    licenseId: uuidSchema.optional(),
    deviceId: uuidSchema,
    contractId: uuidSchema,
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
    licenseType: licenseTypeSchema,
    keyId: z.string().min(1),
    algorithm: z.literal("RSA-SHA256"),
    hardwareFingerprint: z.string().min(1).max(300).optional(),
    licenseKeyHash: z.string().regex(/^[a-f0-9]{64}$/i).optional()
  })
  .superRefine((value, ctx) => {
    const issuedAt = new Date(value.issuedAt).getTime();
    const expiresAt = value.expiresAt ? new Date(value.expiresAt).getTime() : undefined;

    if (value.licenseType === "temporary" && !value.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Temporary licenses require an expiration timestamp."
      });
    }

    if (expiresAt !== undefined && expiresAt <= issuedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "License expiration must be after issuance."
      });
    }
  });

const signedVerificationSchema = z.object({
  payload: signedLicensePayloadSchema,
  signature: z.string().min(64)
});

const keyVerificationSchema = z.object({
  licenseKey: z.string().min(1),
  deviceId: uuidSchema,
  contractId: uuidSchema,
  licenseType: licenseTypeSchema.optional()
});

export const verifyLicenseSchema = z.union([signedVerificationSchema, keyVerificationSchema]);

export const licenseParamsSchema = z.object({
  licenseId: uuidSchema
});

export const deviceLicenseParamsSchema = z.object({
  deviceId: uuidSchema
});

export type IssueLicenseInput = z.infer<typeof issueLicenseSchema>;
export type VerifyLicenseInput = z.infer<typeof verifyLicenseSchema>;
export type LicenseType = z.infer<typeof licenseTypeSchema>;
export type LicensePayload = {
  licenseId?: string;
  deviceId: string;
  contractId: string;
  issuedAt: string;
  expiresAt?: string;
  licenseType: LicenseType;
  keyId: string;
  algorithm: "RSA-SHA256";
  hardwareFingerprint?: string;
  licenseKeyHash?: string;
};

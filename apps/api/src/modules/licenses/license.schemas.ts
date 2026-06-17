import { z } from "zod";

const uuidSchema = z.string().uuid();

export const issueLicenseSchema = z.object({
  deviceId: uuidSchema,
  contractId: uuidSchema,
  expiresAt: z.coerce.date(),
  metadata: z.record(z.unknown()).default({})
});

export const verifyLicenseSchema = z.object({
  payload: z.object({
    licenseId: uuidSchema.optional(),
    deviceId: uuidSchema,
    contractId: uuidSchema,
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    keyId: z.string().min(1),
    algorithm: z.literal("RSA-SHA256")
  }),
  signature: z.string().min(64)
});

export const licenseParamsSchema = z.object({
  licenseId: uuidSchema
});

export const deviceLicenseParamsSchema = z.object({
  deviceId: uuidSchema
});

export type IssueLicenseInput = z.infer<typeof issueLicenseSchema>;
export type VerifyLicenseInput = z.infer<typeof verifyLicenseSchema>;
export type LicensePayload = VerifyLicenseInput["payload"];


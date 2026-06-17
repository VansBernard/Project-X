import { z } from "zod";

const uuidSchema = z.string().uuid();

export const initializePaymentSchema = z.object({
  customerId: uuidSchema,
  contractId: uuidSchema.optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("NGN"),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const validatePaymentSchema = z.object({
  reference: z.string().min(3).max(200)
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type ValidatePaymentInput = z.infer<typeof validatePaymentSchema>;


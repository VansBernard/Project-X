import { z } from "zod";

const uuidSchema = z.string().uuid();

export const contractStatusSchema = z.enum(["active", "completed", "defaulted", "cancelled"]);

export const createContractSchema = z.object({
  customerId: uuidSchema,
  deviceId: uuidSchema.optional(),
  contractNumber: z.string().min(1).max(120),
  currency: z.string().trim().toUpperCase().length(3).default("NGN"),
  devicePrice: z.coerce.number().positive(),
  deposit: z.coerce.number().nonnegative().default(0),
  installmentAmount: z.coerce.number().positive(),
  firstDueDate: z.coerce.date(),
  installmentCount: z.coerce.number().int().min(1).max(120),  paymentPlan: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),  metadata: z.record(z.unknown()).default({})
});

export const updateContractStatusSchema = z.object({
  status: contractStatusSchema,
  reason: z.string().min(3).max(500).optional()
});

export const cancelPlanRequestSchema = z.object({
  contractId: uuidSchema,
  reason: z.string().max(500).optional()
});

export const cancelPlanDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().min(3).max(500).optional()
});

export const contractParamsSchema = z.object({
  contractId: uuidSchema
});

export const listContractsQuerySchema = z.object({
  status: contractStatusSchema.optional(),
  customerId: uuidSchema.optional(),
  deviceId: uuidSchema.optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: uuidSchema.optional()
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;
export type CancelPlanRequestInput = z.infer<typeof cancelPlanRequestSchema>;
export type CancelPlanDecisionInput = z.infer<typeof cancelPlanDecisionSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;


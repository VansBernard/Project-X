import { z } from "zod";

const uuidSchema = z.string().uuid();

export const createDealerSchema = z.object({
  name: z.string().min(1).max(200),
  legalName: z.string().min(1).max(240).optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  country: z.string().length(2).optional(),
  timezone: z.string().min(1).max(80).default("UTC"),
  metadata: z.record(z.unknown()).default({})
});

export const suspendDealerSchema = z.object({
  reason: z.string().min(3).max(500).optional()
});

export const dealerIdParamsSchema = z.object({
  dealerId: uuidSchema
});

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  country: z.string().length(2).optional(),
  metadata: z.record(z.unknown()).default({})
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerIdParamsSchema = z.object({
  customerId: uuidSchema
});

export const registerDeviceSchema = z.object({
  customerId: uuidSchema.optional(),
  serialNumber: z.string().min(1).max(160),
  manufacturer: z.string().max(160).optional(),
  model: z.string().max(160).optional(),
  hardwareFingerprint: z.string().max(300).optional(),
  metadata: z.record(z.unknown()).default({})
});

export const createContractSchema = z.object({
  customerId: uuidSchema,
  deviceId: uuidSchema.optional(),
  contractNumber: z.string().min(1).max(120),
  currency: z.string().length(3).default("NGN"),
  devicePrice: z.coerce.number().positive(),
  deposit: z.coerce.number().nonnegative().default(0),
  installmentAmount: z.coerce.number().positive(),
  firstDueDate: z.coerce.date(),
  installmentCount: z.coerce.number().int().min(1).max(120),
  metadata: z.record(z.unknown()).default({})
});

export const listQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: uuidSchema.optional(),
  status: z.string().optional()
});

export type CreateDealerInput = z.infer<typeof createDealerSchema>;
export type SuspendDealerInput = z.infer<typeof suspendDealerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;

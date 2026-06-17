import { z } from "zod";

const uuidSchema = z.string().uuid();

export const emergencyContactSchema = z.object({
  name: z.string().min(1).max(160),
  phone: z.string().min(3).max(40),
  relationship: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional()
});

export const createCustomerProfileSchema = z.object({
  fullName: z.string().min(2).max(240),
  phone: z.string().min(3).max(40).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  nationalId: z.string().min(3).max(120).optional(),
  emergencyContact: emergencyContactSchema.optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  country: z.string().length(2).optional(),
  metadata: z.record(z.unknown()).default({})
});

export const updateCustomerProfileSchema = createCustomerProfileSchema.partial();

export const customerParamsSchema = z.object({
  customerId: uuidSchema
});

export const customerSearchQuerySchema = z.object({
  q: z.string().min(1).max(160).optional(),
  status: z.string().min(1).max(40).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  nationalId: z.string().min(3).max(120).optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: uuidSchema.optional()
});

export type CreateCustomerProfileInput = z.infer<typeof createCustomerProfileSchema>;
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
export type CustomerSearchQuery = z.infer<typeof customerSearchQuerySchema>;


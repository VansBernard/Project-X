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

export const dealerSignupSchema = z.object({
  dealer: createDealerSchema,
  owner: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(200),
    firstName: z.string().min(1).max(120).optional(),
    lastName: z.string().min(1).max(120).optional(),
    phone: z.string().min(3).max(40).optional()
  })
});

export const confirmDealerSignupSchema = z.object({
  token: z.string().min(20)
});

export const resolvePayoutAccountSchema = z.object({
  country: z.enum(["NG", "GH"]),
  bankCode: z.string().min(2).max(30),
  accountNumber: z.string().min(5).max(40)
});

export const payoutBanksQuerySchema = z.object({
  country: z.enum(["NG", "GH", "KE", "ZA"])
});

export const suspendDealerSchema = z.object({
  reason: z.string().min(3).max(500).optional()
});

export const updatePayoutDetailsSchema = z.object({
  payoutMethod: z.enum(["bank", "mobile_money"]),
  bankCode: z.string().min(2).max(30).optional(),
  accountNumber: z.string().min(5).max(40),
  accountHolderName: z.string().min(2).max(160).optional(),
  mobileMoneyProvider: z.string().min(2).max(30).optional(),
  currency: z.string().trim().toUpperCase().length(3)
}).superRefine((value, context) => {
  if (value.payoutMethod === "bank" && !value.bankCode) context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankCode"], message: "Bank code is required." });
  if (value.payoutMethod === "mobile_money" && !value.mobileMoneyProvider) context.addIssue({ code: z.ZodIssueCode.custom, path: ["mobileMoneyProvider"], message: "Mobile money provider is required." });
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
  currency: z.string().trim().toUpperCase().length(3).default("NGN"),
  devicePrice: z.coerce.number().positive(),
  deposit: z.coerce.number().nonnegative().default(0),
  installmentAmount: z.coerce.number().positive(),
  firstDueDate: z.coerce.date(),
  installmentCount: z.coerce.number().int().min(1).max(120),  paymentPlan: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),  metadata: z.record(z.unknown()).default({})
});

// One idempotent request for desktop onboarding. contractNumber is the retry key.
export const completeRegistrationSchema = z.object({
  customer: createCustomerSchema,
  device: registerDeviceSchema.omit({ customerId: true }),
  contract: z.object({
    contractNumber: z.string().min(1).max(120),
    currency: z.string().trim().toUpperCase().length(3).default("NGN"),
    devicePrice: z.coerce.number().positive(),
    deposit: z.coerce.number().nonnegative().default(0),
    installmentAmount: z.coerce.number().positive(),
    firstDueDate: z.coerce.date(),
    installmentCount: z.coerce.number().int().min(1).max(120),
    paymentPlan: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
    metadata: z.record(z.unknown()).default({})
  })
});

export const listQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: uuidSchema.optional(),
  status: z.string().optional()
});

export const updateDealerProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  legalName: z.string().min(1).max(240).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  country: z.string().length(2).optional(),
  timezone: z.string().min(1).max(80).optional()
});

export type CreateDealerInput = z.infer<typeof createDealerSchema>;
export type DealerSignupInput = z.infer<typeof dealerSignupSchema>;
export type ConfirmDealerSignupInput = z.infer<typeof confirmDealerSignupSchema>;
export type ResolvePayoutAccountInput = z.infer<typeof resolvePayoutAccountSchema>;
export type PayoutBanksQueryInput = z.infer<typeof payoutBanksQuerySchema>;
export type SuspendDealerInput = z.infer<typeof suspendDealerSchema>;
export type UpdatePayoutDetailsInput = z.infer<typeof updatePayoutDetailsSchema>;
export type UpdateDealerProfileInput = z.infer<typeof updateDealerProfileSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CompleteRegistrationInput = z.infer<typeof completeRegistrationSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;

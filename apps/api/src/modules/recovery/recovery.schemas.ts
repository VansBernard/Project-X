import { z } from "zod";

export const createRecoveryAuthorizationSchema = z.object({
  recoveryId: z.string().trim().regex(/^PX-[A-F0-9]{12}$/i)
});

export type CreateRecoveryAuthorizationInput = z.infer<typeof createRecoveryAuthorizationSchema>;
import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { paystackService } from "./paystack.service.js";
import type { InitializePaymentInput, ValidatePaymentInput } from "./paystack.schemas.js";

function dealerIdFromAuth(req: Request<any, any, any, any>): string {
  if (!req.auth?.dealerId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
  }

  return req.auth.dealerId;
}

export const paystackController = {
  async initialize(req: Request<object, object, InitializePaymentInput>, res: Response) {
    const result = await paystackService.initializePayment(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: result });
  },

  async validate(req: Request<object, object, ValidatePaymentInput>, res: Response) {
    const result = await paystackService.validatePayment(dealerIdFromAuth(req), req.body);
    return res.status(200).json({ data: result });
  },

  async retry(req: Request<object, object, ValidatePaymentInput>, res: Response) {
    const result = await paystackService.retryInitialization(dealerIdFromAuth(req), req.body);
    return res.status(200).json({ data: result });
  },

  async webhook(req: Request, res: Response) {
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(400, "INVALID_WEBHOOK_BODY", "Webhook body must be raw bytes.");
    }

    const result = await paystackService.handleWebhook(
      req.body,
      req.get("x-paystack-signature")
    );

    return res.status(200).json({ data: result });
  }
};

import express, { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { validate } from "../../middleware/validate.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { paystackController } from "./paystack.controller.js";
import { initializePaymentSchema, validatePaymentSchema } from "./paystack.schemas.js";

export const paystackRouter = Router();
export const paystackWebhookRouter = Router();

const paymentOperatorRoles = [Roles.SuperAdmin, Roles.Dealer, Roles.SalesAgent];

paystackRouter.use(authenticate);

paystackRouter.post(
  "/payments/paystack/initialize",
  requireRole(...paymentOperatorRoles),
  requirePermission(Permissions.PaymentsInitialize),
  validate(initializePaymentSchema),
  asyncHandler(paystackController.initialize)
);

paystackRouter.post(
  "/payments/paystack/validate",
  requireRole(...paymentOperatorRoles),
  requirePermission(Permissions.PaymentsValidate),
  validate(validatePaymentSchema),
  asyncHandler(paystackController.validate)
);

paystackRouter.post(
  "/payments/paystack/retry",
  requireRole(...paymentOperatorRoles),
  requirePermission(Permissions.PaymentsInitialize),
  validate(validatePaymentSchema),
  asyncHandler(paystackController.retry)
);

paystackWebhookRouter.post(
  "/webhooks/paystack",
  express.raw({ type: "application/json", limit: "1mb" }),
  asyncHandler(paystackController.webhook)
);

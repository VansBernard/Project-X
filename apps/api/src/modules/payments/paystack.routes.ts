import express, { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { rateLimit } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { paystackController } from "./paystack.controller.js";
import { createDeviceCheckoutSchema, initializePaymentSchema, payoutRetryParamsSchema, validatePaymentSchema } from "./paystack.schemas.js";

export const paystackRouter = Router();
export const paystackWebhookRouter = Router();
export const paymentPortalRouter = Router();

const paymentPortalLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 });

const paymentOperatorRoles = [Roles.SuperAdmin, Roles.Dealer, Roles.SalesAgent];

paymentPortalRouter.get("/r/:token", asyncHandler(paystackController.redirectFromPaymentLink));
paymentPortalRouter.post("/r/:token/checkout", paymentPortalLimit, asyncHandler(paystackController.beginPaymentFromLink));

paystackRouter.use(authenticate);

paystackRouter.post(
  "/payments/paystack/initialize",
  requireRole(...paymentOperatorRoles),
  requirePermission(Permissions.PaymentsInitialize),
  validate(initializePaymentSchema),
  asyncHandler(paystackController.initialize)
);

paystackRouter.post(
  "/devices/:deviceId/payment-checkout",
  requireRole(...paymentOperatorRoles),
  requirePermission(Permissions.PaymentsInitialize),
  validate(createDeviceCheckoutSchema),
  asyncHandler(paystackController.createDeviceCheckout)
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

paystackRouter.post(
  "/payments/paystack/payouts/:paymentId/retry",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  requirePermission(Permissions.PaymentsInitialize),
  validate(payoutRetryParamsSchema, "params"),
  asyncHandler(paystackController.retryDealerPayout)
);

paystackWebhookRouter.post(
  "/webhooks/paystack",
  express.raw({ type: "application/json", limit: "1mb" }),
  asyncHandler(paystackController.webhook)
);

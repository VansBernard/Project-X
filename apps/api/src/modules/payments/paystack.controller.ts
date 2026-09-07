import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { paystackService } from "./paystack.service.js";
import type { PaymentLinkType } from "./paystack.service.js";
import type { CreateDeviceCheckoutInput, InitializePaymentInput, ValidatePaymentInput } from "./paystack.schemas.js";

function dealerIdFromAuth(req: Request<any, any, any, any>): string {
  if (!req.auth?.dealerId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
  }

  return req.auth.dealerId;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character] ?? character);
}

function paymentTypeFromRequest(req: Request): PaymentLinkType {
  const type = req.query.type;
  if (type === undefined || type === "temporary") return "temporary";
  if (type === "permanent") return "permanent";
  throw new AppError(400, "INVALID_PAYMENT_LINK_TYPE", "Payment link type must be temporary or permanent.");
}

export const paystackController = {
  async initialize(req: Request<object, object, InitializePaymentInput>, res: Response) {
    const result = await paystackService.initializePayment(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: result });
  },

  async createDeviceCheckout(req: Request<{ deviceId: string }, object, CreateDeviceCheckoutInput>, res: Response) {
    if (req.params.deviceId !== req.body.deviceId) {
      throw new AppError(400, "DEVICE_ID_MISMATCH", "The request device ID does not match the checkout device ID.");
    }

    const result = await paystackService.createDeviceCheckout(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: result });
  },

  async redirectFromPaymentLink(req: Request<{ token: string }>, res: Response) {
    const paymentType = paymentTypeFromRequest(req);
    const summary = await paystackService.getPaymentLinkSummary(req.params.token, paymentType);
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: summary.currency
    }).format(summary.amount);

    const isPermanent = summary.paymentType === "permanent";
    const licenseTitle = isPermanent ? "Permanent unlock" : "Temporary license renewal";
    const description = isPermanent
      ? "Settle the full remaining balance to receive a permanent unlock license."
      : "Pay the next installment to renew your temporary recovery license.";
    const deliveryEmail = summary.customerEmail
      ? escapeHtml(summary.customerEmail)
      : "No delivery email is available";
    const checkoutUrl = `/r/${encodeURIComponent(req.params.token)}/checkout?type=${summary.paymentType}`;

    return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Project X Payment</title>
    <style>body{margin:0;background:#f4f7fb;color:#11233d;font-family:Arial,sans-serif}.card{max-width:480px;margin:48px auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 8px 30px #16335a1a}h1{margin:0 0 8px}.muted{color:#5f6d80}.details{margin:24px 0;padding:16px;background:#f6f9fd;border-radius:10px}.row{display:flex;justify-content:space-between;gap:12px;margin:12px 0}.amount{font-size:24px;font-weight:700}button{width:100%;border:0;border-radius:10px;padding:15px;background:#0d4da3;color:#fff;font-size:16px;font-weight:700;cursor:pointer}</style>
  </head>
  <body><main class="card">
    <h1>${licenseTitle}</h1>
    <p class="muted">${description}</p>
    <section class="details">
      <div class="row"><span>Device</span><strong>${escapeHtml(summary.serialNumber)}</strong></div>
      <div class="row"><span>Contract</span><strong>${escapeHtml(summary.contractNumber)}</strong></div>
      <div class="row"><span>Customer</span><strong>${escapeHtml(summary.customerName)}</strong></div>
      <div class="row"><span>License delivery email</span><strong>${deliveryEmail}</strong></div>
      <div class="row"><span>License</span><strong>${isPermanent ? "Permanent unlock" : "Temporary recovery"}</strong></div>
      <div class="row amount"><span>${isPermanent ? "Full settlement" : "Due now"}</span><strong>${escapeHtml(amount)}</strong></div>
    </section>
    <form method="post" action="${checkoutUrl}"><button type="submit">Continue to secure payment</button></form>
    <p class="muted">${summary.customerEmail ? "Your license will be sent to the delivery email above after payment." : "Contact your dealer to add a delivery email before paying."}</p>
    <p class="muted">Payment is processed securely by Paystack.</p>
  </main></body>
</html>`);
  },

  async beginPaymentFromLink(req: Request<{ token: string }>, res: Response) {
    const checkout = await paystackService.createCheckoutFromPaymentLink(req.params.token, paymentTypeFromRequest(req));
    return res.redirect(303, checkout.authorizationUrl);
  },

  async validate(req: Request<object, object, ValidatePaymentInput>, res: Response) {
    const result = await paystackService.validatePayment(dealerIdFromAuth(req), req.body);
    return res.status(200).json({ data: result });
  },

  async retry(req: Request<object, object, ValidatePaymentInput>, res: Response) {
    const result = await paystackService.retryInitialization(dealerIdFromAuth(req), req.body);
    return res.status(200).json({ data: result });
  },

  async retryDealerPayout(req: Request<{ paymentId: string }>, res: Response) {
    const result = await paystackService.retryDealerPayout(dealerIdFromAuth(req), req.params.paymentId);
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

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

    const customerDisplay = summary.customerName ? escapeHtml(summary.customerName) : "Customer";
    const licenseTypeLabel = isPermanent ? "Permanent unlock key" : "Temporary recovery key";
    const paymentLabel = isPermanent ? "Full settlement" : "Current installment";
    const summaryText = isPermanent
      ? "This unlock is for the full remaining balance and grants permanent access once payment is confirmed."
      : "This payment covers the active temporary license renewal for the current device and contract."
    const remainingLabel = isPermanent ? "Balance remaining" : "Amount due now";

    return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Project X License Payment</title>
    <style>
      :root {
        --bg: #f3f7ff;
        --panel: #ffffff;
        --panel-soft: #f8fbff;
        --line: #dfe8f8;
        --brand: #0f5bd7;
        --brand-dark: #0c2560;
        --brand-soft: #eaf2ff;
        --text: #12233d;
        --muted: #5c6d86;
        --success: #0c8a5d;
        --shadow: rgba(15, 35, 79, 0.12);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: linear-gradient(180deg, #eef5ff 0%, #f9fbff 100%);
        color: var(--text);
      }

      .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
      }

      .card {
        width: min(100%, 560px);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 18px 48px var(--shadow);
        overflow: hidden;
      }

      .topbar {
        background: linear-gradient(135deg, #0d4da3 0%, #0d224f 100%);
        padding: 22px 22px 18px;
        color: #ffffff;
      }

      .topbar-badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 700;
      }

      .title {
        margin: 14px 0 6px;
        font-size: clamp(1.7rem, 4vw, 2.5rem);
        line-height: 1.1;
        font-weight: 800;
      }

      .subtitle {
        margin: 0;
        font-size: clamp(0.92rem, 2.4vw, 1rem);
        line-height: 1.6;
        color: rgba(255,255,255,0.88);
      }

      .content {
        padding: 22px;
      }

      .customer-box {
        padding: 18px;
        border-radius: 18px;
        background: var(--panel-soft);
        border: 1px solid var(--line);
        margin-bottom: 18px;
      }

      .label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.73rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 700;
      }

      .customer-name {
        margin: 0 0 10px;
        font-size: clamp(1.2rem, 3vw, 1.5rem);
        font-weight: 800;
        color: var(--text);
      }

      .customer-meta {
        display: grid;
        gap: 10px;
        font-size: 0.92rem;
        color: var(--muted);
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid var(--line);
      }

      .meta-row strong {
        color: var(--text);
        font-weight: 700;
        text-align: right;
      }

      .amount-box {
        background: linear-gradient(135deg, #eef5ff 0%, #f7fbff 100%);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        margin-bottom: 18px;
      }

      .amount-main {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .amount-copy {
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 700;
      }

      .amount-value {
        font-size: clamp(2rem, 7vw, 2.7rem);
        line-height: 1;
        font-weight: 900;
        color: var(--brand-dark);
      }

      .details {
        display: grid;
        gap: 12px;
        margin-bottom: 20px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
        font-size: 0.96rem;
      }

      .detail-row:last-child {
        border-bottom: none;
      }

      .detail-row span {
        color: var(--muted);
      }

      .detail-row strong {
        color: var(--text);
        text-align: right;
        font-weight: 700;
      }

      .footer-note {
        margin: 0 0 16px;
        color: var(--muted);
        font-size: 0.92rem;
        line-height: 1.6;
      }

      form { margin: 0; }

      button {
        width: 100%;
        border: 0;
        background: linear-gradient(135deg, #0e63df 0%, #104da2 100%);
        color: #ffffff;
        font-size: 1rem;
        font-weight: 800;
        border-radius: 14px;
        padding: 16px 18px;
        cursor: pointer;
        letter-spacing: 0.02em;
        box-shadow: 0 12px 24px rgba(15, 93, 215, 0.24);
      }

      button:active { transform: translateY(1px); }

      .secure {
        margin-top: 14px;
        text-align: center;
        font-size: 0.82rem;
        color: var(--muted);
      }

      @media (max-width: 480px) {
        .page { padding: 12px; }
        .topbar, .content { padding-left: 16px; padding-right: 16px; }
        .topbar { padding-top: 18px; padding-bottom: 16px; }
        .detail-row, .meta-row {
          flex-direction: column;
          align-items: flex-start;
        }
        .detail-row strong, .meta-row strong {
          text-align: left;
        }
        .amount-box {
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card" aria-label="Project X license payment summary">
        <header class="topbar">
          <span class="topbar-badge">Project X</span>
          <h1 class="title">${licenseTitle}</h1>
          <p class="subtitle">${description}</p>
        </header>

        <div class="content">
          <div class="customer-box">
            <span class="label">Customer</span>
            <p class="customer-name">${customerDisplay}</p>
            <div class="customer-meta">
              <div class="meta-row"><span>Device</span><strong>${escapeHtml(summary.serialNumber)}</strong></div>
              <div class="meta-row"><span>Contract</span><strong>${escapeHtml(summary.contractNumber)}</strong></div>
              <div class="meta-row"><span>Delivery email</span><strong>${deliveryEmail}</strong></div>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-main">
              <div>
                <div class="amount-copy">${paymentLabel}</div>
                <div class="amount-value">${escapeHtml(amount)}</div>
              </div>
              <div class="amount-copy">${licenseTypeLabel}</div>
            </div>
          </div>

          <div class="details">
            <div class="detail-row"><span>License type</span><strong>${isPermanent ? "Permanent unlock" : "Temporary recovery"}</strong></div>
            <div class="detail-row"><span>${remainingLabel}</span><strong>${escapeHtml(amount)}</strong></div>
            <div class="detail-row"><span>Balance remaining</span><strong>${escapeHtml(new Intl.NumberFormat("en-US", { style: "currency", currency: summary.currency }).format(summary.remainingBalance))}</strong></div>
          </div>

          <p class="footer-note">${summaryText}</p>

          <form method="post" action="${checkoutUrl}">
            <button type="submit">Continue to secure payment</button>
          </form>

          <div class="secure">Secure payment powered by Paystack</div>
        </div>
      </section>
    </main>
  </body>
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

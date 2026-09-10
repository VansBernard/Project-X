import { env } from "../../../config/env.js";
import {
  licenseEmailHtml,
  licenseEmailSubject,
  licenseEmailText
} from "./license-email.template.js";

type SendLicenseEmailInput = {
  to: string;
  customerName: string;
  deviceInformation: string;
  paymentInformation: string;
  expirationDate: string;
  licenseKey: string;
  licenseType: "temporary" | "permanent";
  deliveryMessage?: string;
};

type SendDealerRegistrationEmailInput = {
  to: string;
  dealerName: string;
  dealerSlug: string;
  verificationUrl: string;
};

type SendPayoutFailureEmailInput = {
  to: string;
  dealerName: string;
  amount: number;
  currency: string;
  paymentReference: string;
};

const brevoEndpoint = "https://api.brevo.com/v3/smtp/email";

async function sendEmail(input: { to: string; subject: string; text: string; html: string }) {
  const response = await fetch(brevoEndpoint, {
    method: "POST",
    headers: {
      "api-key": String(env.BREVO_API_KEY),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sender: { email: env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.EMAIL_FROM },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.text,
      htmlContent: input.html
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Brevo email request failed (${response.status}): ${details.slice(0, 500)}`);
  }

  return response.json();
}

export const emailService = {
  async sendLicenseEmail(input: SendLicenseEmailInput) {
    return sendEmail({
      to: input.to,
      subject: licenseEmailSubject(input),
      text: licenseEmailText(input),
      html: licenseEmailHtml(input)
    });
  },

  async sendDealerRegistrationEmail(input: SendDealerRegistrationEmailInput) {
    return sendEmail({
      to: input.to,
      subject: `Confirm your ${input.dealerName} dealer account`,
      text: `Your Project X dealer account has been created. Confirm your email before signing in: ${input.verificationUrl}`,
      html: `<p>Your <strong>${input.dealerName}</strong> dealer account has been created.</p><p><a href="${input.verificationUrl}">Confirm your email address</a> before signing in to the <strong>${input.dealerSlug}</strong> workspace.</p>`
    });
  },

  async sendPayoutFailureEmail(input: SendPayoutFailureEmailInput) {
    return sendEmail({
      to: input.to,
      subject: `Action needed: payout failed for ${input.dealerName}`,
      text: `A ${input.currency} ${input.amount.toFixed(2)} payout for payment ${input.paymentReference} could not be sent. Update the payout details, then retry it from the admin dashboard.`,
      html: `<p>A <strong>${input.currency} ${input.amount.toFixed(2)}</strong> payout for payment <strong>${input.paymentReference}</strong> could not be sent.</p><p>Update the payout details, then retry it from the admin dashboard.</p>`
    });
  }
};

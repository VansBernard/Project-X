import path from "node:path";
import { existsSync } from "node:fs";
import nodemailer from "nodemailer";
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

type SendWelcomeEmailInput = {
  to: string;
  customerName: string;
  dealerName: string;
  deviceModel?: string;
};

type SendPayoutFailureEmailInput = {
  to: string;
  dealerName: string;
  amount: number;
  currency: string;
  paymentReference: string;
};

type SendSignupOtpEmailInput = {
  to: string;
  dealerName: string;
  otpCode: string;
  expiresInMinutes: number;
};

const brevoEndpoint = "https://api.brevo.com/v3/smtp/email";

function brandEmailHtml({ title, intro, bodyRows, footer }: {
  title: string;
  intro: string;
  bodyRows: Array<{ label: string; value: string }>;
  footer?: string;
}) {
  const rowsHtml = bodyRows.map((row) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #1f2937; vertical-align: top;">${row.label}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; vertical-align: top;">${row.value}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 24px 0; color: #111827;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);">
        <div style="background: linear-gradient(135deg, #0b5ed7 0%, #0f172a 100%); padding: 20px 28px; color: #ffffff;">
          <div style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9;">Project X</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">${title}</div>
        </div>
        <div style="padding: 24px 28px 18px;">
          <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.6; color: #111827;">${intro}</p>
          <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${footer ? `<p style="margin: 18px 0 0; font-size: 14px; line-height: 1.6; color: #374151;">${footer}</p>` : ""}
        </div>
      </div>
    </div>
  `;
}

async function sendEmail(input: { to: string; subject: string; text: string; html: string; attachments?: Array<{ filename: string; path: string; cid?: string }> }) {
  const smtpHost = env.SMTP_HOST;
  const smtpUser = env.SMTP_USER;
  const smtpPass = env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments
      });
    } catch (error) {
      const providerMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`SMTP delivery failed: ${providerMessage}`);
    }

    return { status: "queued" };
  }

  if (env.BREVO_API_KEY) {
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
      throw new Error(`Brevo delivery failed (${response.status}): ${details.slice(0, 500)}`);
    }

    return response.json();
  }

  throw new Error("No SMTP or Brevo email provider is configured for outbound emails.");
}

export const emailService = {
  async sendLicenseEmail(input: SendLicenseEmailInput) {
    const logoPath = path.resolve(process.cwd(), "apps/admin/public/Project X.png");
    const attachments = existsSync(logoPath)
      ? [{ filename: "Project X.png", path: logoPath, cid: "projectx-logo" }]
      : [];

    return sendEmail({
      to: input.to,
      subject: licenseEmailSubject(input),
      text: licenseEmailText(input),
      html: licenseEmailHtml(input),
      attachments
    });
  },

  async sendDealerRegistrationEmail(input: SendDealerRegistrationEmailInput) {
    const subject = `Confirm your ${input.dealerName} dealer account`;
    const text = [
      `Hello ${input.dealerName},`,
      "",
      "Your Project X dealer account has been created.",
      "",
      `Workspace: ${input.dealerSlug}`,
      `Verification link: ${input.verificationUrl}`,
      "",
      "Please confirm your email address before signing in."
    ].join("\n");

    const html = brandEmailHtml({
      title: "Confirm your account",
      intro: `Hello ${input.dealerName}, your Project X dealer account has been created. Please confirm your email address to activate your workspace.` ,
      bodyRows: [
        { label: "Dealer", value: input.dealerName },
        { label: "Workspace", value: input.dealerSlug },
        { label: "Action", value: `<a href="${input.verificationUrl}" style="color: #0b5ed7; text-decoration: none; font-weight: 700;">Confirm email address</a>` }
      ],
      footer: "Once confirmed, you will be able to sign in and continue managing your dealer workspace."
    });

    return sendEmail({ to: input.to, subject, text, html });
  },

  async sendCustomerWelcomeEmail(input: SendWelcomeEmailInput) {
    const subject = `Welcome to Project X, ${input.customerName}`;
    const deviceLine = input.deviceModel ? `Registered device: ${input.deviceModel}` : "Registered device: Your Project X device";
    const text = [
      `Hello ${input.customerName},`,
      "",
      "Welcome to Project X.",
      "Your device account has been created successfully.",
      "",
      `Dealer: ${input.dealerName}`,
      deviceLine,
      "",
      "This is the email address where you will receive your licenses, reports, and important updates.",
      "",
      "Thank you for choosing Project X."
    ].join("\n");

    const logoPath = path.resolve(process.cwd(), "apps/admin/public/Project X.png");
    const attachments = existsSync(logoPath)
      ? [{ filename: "Project X.png", path: logoPath, cid: "projectx-logo" }]
      : [];

    const html = `
      <div style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#111827;">
        <div style="max-width:720px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:18px; overflow:hidden; box-shadow:0 10px 28px rgba(15,23,42,0.08);">
          <div style="padding:24px 28px 18px; background:linear-gradient(135deg,#f8fafc 0%, #eef6ff 100%); border-bottom:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
              <tr>
                <td style="width:56px; vertical-align:middle;">
                  <img src="cid:projectx-logo" alt="Project X" style="display:block; width:46px; height:46px; border-radius:50%; object-fit:cover; background:#fff;" />
                </td>
                <td style="padding-left:12px; vertical-align:middle;">
                  <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#64748b; font-weight:700;">Project X</div>
                  <div style="font-size:26px; line-height:1.2; font-weight:700; color:#0f172a; margin-top:2px;">Welcome</div>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding:28px; background:#ffffff;">
            <p style="margin:0 0 14px; font-size:17px; line-height:1.7; color:#111827;">Hello ${input.customerName},</p>
            <p style="margin:0 0 20px; font-size:16px; line-height:1.7; color:#374151;">
              Welcome to Project X. Your device account has been created successfully, and this is the email address where you will receive your licenses, reports, and important notices.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate; border-spacing:0; background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; margin-bottom:18px;">
              <tr>
                <td style="padding:12px 14px; border-bottom:1px solid #e5e7eb; font-weight:700; color:#1f2937; width:42%;">Dealer</td>
                <td style="padding:12px 14px; border-bottom:1px solid #e5e7eb; color:#374151;">${input.dealerName}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px; font-weight:700; color:#1f2937;">Device</td>
                <td style="padding:12px 14px; color:#374151;">${input.deviceModel ?? "Your Project X device"}</td>
              </tr>
            </table>

            <p style="margin:0; font-size:16px; line-height:1.7; color:#374151;">
              Thank you for choosing Project X. We look forward to keeping your account informed with every license update, report, and important message.
            </p>
          </div>
        </div>
      </div>
    `;

    return sendEmail({ to: input.to, subject, text, html, attachments });
  },

  async sendSignupOtpEmail(input: SendSignupOtpEmailInput) {
    const subject = `Your ${input.dealerName} verification code`;
    const text = [
      `Hello ${input.dealerName},`,
      "",
      `Your Project X verification code is ${input.otpCode}.`,
      `Enter it in the app to complete your signup. This code expires in ${input.expiresInMinutes} minutes.`,
      "",
      "Do not share this code with anyone."
    ].join("\n");

    const logoUrl = "https://localhost:5173/Project%20X.png";

    const html = `
      <div style="margin:0; padding:0; background:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#111827;">
        <div style="max-width:760px; margin:0 auto; background:#ffffff; padding:20px 20px 10px;">
          <div style="display:flex; align-items:center; justify-content:center; margin-bottom:20px;">
            <img src="${logoUrl}" alt="Project X" style="display:block; width:72px; height:72px; border-radius:50%; object-fit:cover; background:#ffffff;" />
          </div>

          <div style="text-align:center; margin-top:8px; margin-bottom:22px;">
            <h1 style="margin:0; font-size:42px; line-height:1.12; font-weight:800; letter-spacing:-0.05em; color:#111827;">
              Please verify your<br>
              identity,<br>
              <span style="font-weight:800;">${input.dealerName}</span>
            </h1>
          </div>

          <div style="margin:18px 0 0; max-width:640px; margin-left:auto; margin-right:auto; padding:0 0 8px;">
            <p style="margin:0 0 20px; font-size:18px; line-height:1.6; color:#374151;">
              Here is your Project X authentication code:
            </p>

            <div style="text-align:center; margin:16px 0 18px;">
              <div style="display:inline-block; min-width:260px; padding:20px 18px; border-radius:12px; background:#f3f4f6; border:1px solid #e5e7eb; letter-spacing:0.18em; font-size:30px; font-weight:800; color:#111827; font-family:Arial, Helvetica, sans-serif;">
                ${input.otpCode}
              </div>
            </div>

            <p style="margin:0 0 10px; font-size:18px; line-height:1.6; color:#374151;">
              This code is valid for <strong>${input.expiresInMinutes}</strong> minutes and can only be used once.
            </p>

            <p style="margin:18px 0 0; font-size:18px; line-height:1.7; color:#374151;">
              Please don't share this code with anyone: we'll never ask for it on the phone or via email.
            </p>
          </div>

          <div style="margin-top:28px; font-size:16px; line-height:1.7; color:#4b5563; text-align:left;">
            You're receiving this email because a verification code was requested for your Project X account. If this wasn't you, please ignore this email.
          </div>
        </div>
      </div>
    `;
    return sendEmail({ to: input.to, subject, text, html });
  },

  async sendPayoutFailureEmail(input: SendPayoutFailureEmailInput) {
    const subject = `Action needed: payout failed for ${input.dealerName}`;
    const text = [
      `Hello ${input.dealerName},`,
      "",
      `A ${input.currency} ${input.amount.toFixed(2)} payout for payment ${input.paymentReference} could not be processed.`,
      "",
      "Update your payout details and retry the transaction from the admin dashboard."
    ].join("\n");

    const html = brandEmailHtml({
      title: "Payout action required",
      intro: `Hello ${input.dealerName}, a payout could not be completed for your account.`,
      bodyRows: [
        { label: "Dealer", value: input.dealerName },
        { label: "Amount", value: `${input.currency} ${input.amount.toFixed(2)}` },
        { label: "Payment reference", value: input.paymentReference }
      ],
      footer: "Update the payout details and retry from the admin dashboard to complete the transaction."
    });

    return sendEmail({ to: input.to, subject, text, html });
  }
};

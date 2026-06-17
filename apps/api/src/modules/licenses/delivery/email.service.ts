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
};

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  }
});

export const emailService = {
  async sendLicenseEmail(input: SendLicenseEmailInput) {
    return transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: licenseEmailSubject(input),
      text: licenseEmailText(input),
      html: licenseEmailHtml(input)
    });
  }
};


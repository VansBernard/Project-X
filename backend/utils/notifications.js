import nodemailer from 'nodemailer';
import logger from './logger.js';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for email delivery`);
  }
  return value;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: requiredEnv('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: requiredEnv('SMTP_USER'),
      pass: requiredEnv('SMTP_PASS')
    }
  });
}

function buildUnlockTokenEmail({ customerName, token, validUntil }) {
  const displayName = customerName || 'Customer';
  const supportContact = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || '';

  const text = [
    `Hello ${displayName},`,
    '',
    'Your laptop unlock code is:',
    token,
    '',
    `This code is valid until ${validUntil}.`,
    'Enter this code on your locked laptop to extend access.',
    supportContact ? `If you need help, contact ${supportContact}.` : '',
    '',
    'Thank you.'
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <p>Hello ${displayName},</p>
      <p>Your laptop unlock code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${token}</p>
      <p>This code is valid until <strong>${validUntil}</strong>.</p>
      <p>Enter this code on your locked laptop to extend access.</p>
      ${supportContact ? `<p>If you need help, contact ${supportContact}.</p>` : ''}
      <p>Thank you.</p>
    </div>
  `;

  return { text, html };
}

function buildReleaseTokenEmail({ customerName, token }) {
  const displayName = customerName || 'Customer';
  const supportContact = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || '';

  const text = [
    `Hello ${displayName},`,
    '',
    'Your laptop financing contract is fully paid.',
    '',
    'Your permanent release code is:',
    token,
    '',
    'Enter this code on your locked laptop to remove the payment lock.',
    supportContact ? `If you need help, contact ${supportContact}.` : '',
    '',
    'Thank you.'
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <p>Hello ${displayName},</p>
      <p>Your laptop financing contract is fully paid.</p>
      <p>Your permanent release code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${token}</p>
      <p>Enter this code on your locked laptop to remove the payment lock.</p>
      ${supportContact ? `<p>If you need help, contact ${supportContact}.</p>` : ''}
      <p>Thank you.</p>
    </div>
  `;

  return { text, html };
}

export async function sendUnlockTokenEmail({ to, customerName, token, validUntil }) {
  if (!to) {
    logger.warn('Unlock token email skipped; customer email missing');
    return { sent: false, reason: 'missing_email' };
  }

  if (process.env.EMAIL_ENABLED !== 'true') {
    logger.warn('Unlock token email not sent; EMAIL_ENABLED is not true', {
      to,
      customerName,
      validUntil,
      tokenLast4: token.slice(-4)
    });
    return { sent: false, reason: 'email_disabled' };
  }

  const transporter = createTransporter();
  const from = requiredEnv('EMAIL_FROM');
  const { text, html } = buildUnlockTokenEmail({ customerName, token, validUntil });

  const result = await transporter.sendMail({
    from,
    to,
    subject: 'Your laptop unlock code',
    text,
    html
  });
  const previewUrl = nodemailer.getTestMessageUrl(result);

  logger.info('Unlock token email sent', {
    to,
    validUntil,
    messageId: result.messageId,
    previewUrl,
    tokenLast4: token.slice(-4)
  });

  return { sent: true, messageId: result.messageId, previewUrl };
}

export async function sendReleaseTokenEmail({ to, customerName, token }) {
  if (!to) {
    logger.warn('Release token email skipped; customer email missing');
    return { sent: false, reason: 'missing_email' };
  }

  if (process.env.EMAIL_ENABLED !== 'true') {
    logger.warn('Release token email not sent; EMAIL_ENABLED is not true', {
      to,
      customerName,
      tokenLast4: token.slice(-4)
    });
    return { sent: false, reason: 'email_disabled' };
  }

  const transporter = createTransporter();
  const from = requiredEnv('EMAIL_FROM');
  const { text, html } = buildReleaseTokenEmail({ customerName, token });

  const result = await transporter.sendMail({
    from,
    to,
    subject: 'Your laptop release code',
    text,
    html
  });
  const previewUrl = nodemailer.getTestMessageUrl(result);

  logger.info('Release token email sent', {
    to,
    messageId: result.messageId,
    previewUrl,
    tokenLast4: token.slice(-4)
  });

  return { sent: true, messageId: result.messageId, previewUrl };
}

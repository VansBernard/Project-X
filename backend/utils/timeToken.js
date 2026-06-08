import crypto from 'crypto';

export function generateTimeToken(hardwareUUID, year, month, secret) {
  if (!hardwareUUID || !secret) {
    throw new Error('Missing hardwareUUID or secret for time token generation');
  }

  const payload = `${hardwareUUID}${year}${month}`;
  const digest = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  const numericToken = parseInt(digest.slice(0, 8), 16) % 100000000;
  return String(numericToken).padStart(8, '0');
}

export function generateReleaseToken(hardwareUUID, secret) {
  if (!hardwareUUID || !secret) {
    throw new Error('Missing hardwareUUID or secret for release token generation');
  }

  const payload = `${hardwareUUID}:release`;
  const digest = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  const numericToken = parseInt(digest.slice(0, 8), 16) % 100000000;
  return String(numericToken).padStart(8, '0');
}

export function formatPaystackAmount(amount) {
  // Paystack usually delivers amount in kobo (smallest currency unit).
  // Convert to the main currency unit if the payload is integer-based.
  return Number(amount) / 100;
}

import crypto from 'crypto';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value) {
  return typeof value === 'string' && /^\+?[0-9\-()\s]{7,20}$/.test(value.trim());
}

function isValidDeviceAddress(value) {
  const normalized = normalizeString(value);
  return /^0x[0-9a-fA-F]{40}$/.test(normalized)
    || /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i.test(normalized);
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function validateDeviceRegistration(body) {
  const hardwareUuid = normalizeString(body.hardwareUuid);
  const deviceName = normalizeString(body.deviceName);
  const customerName = normalizeString(body.customerName);
  const customerEmail = normalizeString(body.customerEmail);
  const phoneNumber = normalizeString(body.phoneNumber);
  const totalContractAmount = parsePositiveNumber(body.totalContractAmount);
  const paymentAmount = parsePositiveNumber(body.paymentAmount);
  const paymentFrequency = normalizeString(body.paymentFrequency);
  const deviceAddress = normalizeString(body.deviceAddress || '');

  if (!hardwareUuid) {
    const err = new Error('hardwareUuid is required');
    err.status = 400;
    throw err;
  }

  if (!deviceName) {
    const err = new Error('deviceName is required');
    err.status = 400;
    throw err;
  }

  if (!customerName) {
    const err = new Error('customerName is required');
    err.status = 400;
    throw err;
  }

  if (!customerEmail || !isValidEmail(customerEmail)) {
    const err = new Error('A valid customerEmail is required');
    err.status = 400;
    throw err;
  }

  if (!phoneNumber || !isValidPhone(phoneNumber)) {
    const err = new Error('A valid phoneNumber is required');
    err.status = 400;
    throw err;
  }

  const acceptedFrequencies = new Set(['Weekly', 'Monthly', 'Yearly']);
  if (!acceptedFrequencies.has(paymentFrequency)) {
    const err = new Error('Invalid paymentFrequency');
    err.status = 400;
    throw err;
  }

  if (totalContractAmount === null || paymentAmount === null) {
    const err = new Error('Payment amounts must be positive numbers');
    err.status = 400;
    throw err;
  }

  if (paymentAmount > totalContractAmount) {
    const err = new Error('paymentAmount cannot exceed totalContractAmount');
    err.status = 400;
    throw err;
  }

  if (deviceAddress && !isValidDeviceAddress(deviceAddress)) {
    const err = new Error('deviceAddress must be a valid 0x or grouped identifier');
    err.status = 400;
    throw err;
  }

  return {
    hardwareUuid,
    deviceName,
    customerName,
    customerEmail,
    phoneNumber,
    totalContractAmount,
    paymentFrequency,
    paymentAmount,
    deviceAddress
  };
}

function isValidPaystackSignature(signature, expected) {
  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export {
  normalizeString,
  isValidEmail,
  isValidPhone,
  isValidDeviceAddress,
  parsePositiveNumber,
  validateDeviceRegistration,
  isValidPaystackSignature
};

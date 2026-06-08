import crypto from 'crypto';
import { test } from 'node:test';
import { strict as assert } from 'assert';
import { validateDeviceRegistration, isValidDeviceAddress, isValidPaystackSignature } from '../utils/validation.js';

const validPayload = {
  hardwareUuid: 'ABC123-DEF456',
  deviceName: 'Test Laptop',
  customerName: 'Jane Doe',
  customerEmail: 'jane.doe@example.com',
  phoneNumber: '+1234567890',
  totalContractAmount: '1500',
  paymentAmount: '150',
  paymentFrequency: 'Monthly'
};

test('validateDeviceRegistration accepts valid payload and normalizes values', () => {
  const result = validateDeviceRegistration(validPayload);
  assert.equal(result.hardwareUuid, 'ABC123-DEF456');
  assert.equal(result.customerEmail, 'jane.doe@example.com');
  assert.equal(result.totalContractAmount, 1500);
  assert.equal(result.paymentAmount, 150);
  assert.equal(result.paymentFrequency, 'Monthly');
});

test('validateDeviceRegistration rejects invalid email', () => {
  assert.throws(() => {
    validateDeviceRegistration({ ...validPayload, customerEmail: 'invalid-email' });
  }, /A valid customerEmail is required/);
});

test('validateDeviceRegistration rejects invalid phone number', () => {
  assert.throws(() => {
    validateDeviceRegistration({ ...validPayload, phoneNumber: 'abc123' });
  }, /A valid phoneNumber is required/);
});

test('validateDeviceRegistration rejects invalid payment frequency', () => {
  assert.throws(() => {
    validateDeviceRegistration({ ...validPayload, paymentFrequency: 'Daily' });
  }, /Invalid paymentFrequency/);
});

test('validateDeviceRegistration rejects non-positive amounts', () => {
  assert.throws(() => {
    validateDeviceRegistration({ ...validPayload, totalContractAmount: 0 });
  }, /Payment amounts must be positive numbers/);
});

test('validateDeviceRegistration rejects payment amount greater than total', () => {
  assert.throws(() => {
    validateDeviceRegistration({ ...validPayload, paymentAmount: 2000 });
  }, /paymentAmount cannot exceed totalContractAmount/);
});

test('isValidDeviceAddress accepts valid addresses', () => {
  assert.equal(isValidDeviceAddress('0x1234567890abcdef1234567890abcdef12345678'), true);
  assert.equal(isValidDeviceAddress('ABCD-EF12-3456'), true);
});

test('isValidDeviceAddress rejects invalid addresses', () => {
  assert.equal(isValidDeviceAddress('not-a-device-id'), false);
});

test('isValidPaystackSignature validates correct signature and rejects invalid data', () => {
  const payload = JSON.stringify({ test: true });
  const secret = 'secret-test';
  const expected = crypto.createHmac('sha512', secret).update(payload).digest('hex');

  assert.equal(isValidPaystackSignature(expected, expected), true);
  assert.equal(isValidPaystackSignature('invalidhex', expected), false);
  assert.equal(isValidPaystackSignature(expected, '0'.repeat(128)), false);
});

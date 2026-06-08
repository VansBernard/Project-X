import { strict as assert } from 'assert';
import { test } from 'node:test';
import { generateReleaseToken, generateTimeToken, formatPaystackAmount } from '../utils/timeToken.js';

test('generateTimeToken produces 8-digit numeric token and is deterministic', () => {
  const token1 = generateTimeToken('hw-123', 2026, 6, 'secretX');
  const token2 = generateTimeToken('hw-123', 2026, 6, 'secretX');
  assert.equal(token1.length, 8);
  assert.match(token1, /^[0-9]{8}$/);
  assert.equal(token1, token2, 'Token should be deterministic for same inputs');
});

test('formatPaystackAmount converts integer kobo to main currency', () => {
  assert.equal(formatPaystackAmount(12345), 123.45);
  assert.equal(formatPaystackAmount('100'), 1); // string should coerce
});

test('generateReleaseToken produces a deterministic permanent release code', () => {
  const token1 = generateReleaseToken('hw-123', 'secretX');
  const token2 = generateReleaseToken('hw-123', 'secretX');
  assert.equal(token1.length, 8);
  assert.match(token1, /^[0-9]{8}$/);
  assert.equal(token1, token2);
  assert.notEqual(token1, generateTimeToken('hw-123', 2026, 6, 'secretX'));
});

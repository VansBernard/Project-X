import assert from "node:assert/strict";
import test from "node:test";
import { issueLicenseSchema, verifyLicenseSchema } from "./license.schemas.js";
import { licenseSigningService } from "./signing.service.js";
import { licenseVerificationService } from "./verification.service.js";

test("verifyLicenseSchema accepts a license-key based verification request", () => {
  const parsed = verifyLicenseSchema.parse({
    licenseKey: "license-key-123",
    deviceId: "11111111-1111-1111-1111-111111111111",
    contractId: "22222222-2222-2222-2222-222222222222"
  });

  if ("licenseKey" in parsed) {
    assert.equal(parsed.licenseKey, "license-key-123");
    assert.equal(parsed.deviceId, "11111111-1111-1111-1111-111111111111");
    assert.equal(parsed.contractId, "22222222-2222-2222-2222-222222222222");
  } else {
    throw new Error("Expected key-based verification input.");
  }
});

test("verifyLicenseSchema preserves the signed license key hash", () => {
  const payload = {
    licenseId: "11111111-1111-1111-1111-111111111111",
    deviceId: "22222222-2222-2222-2222-222222222222",
    contractId: "33333333-3333-3333-3333-333333333333",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2027-01-01T00:00:00.000Z",
    licenseType: "temporary" as const,
    keyId: "default",
    algorithm: "RSA-SHA256" as const,
    hardwareFingerprint: "fp-test-device",
    licenseKeyHash: "a".repeat(64)
  };
  const signature = licenseSigningService.sign(payload);
  const parsed = verifyLicenseSchema.parse({ payload, signature });

  if (!("payload" in parsed)) {
    throw new Error("Expected signed-payload verification input.");
  }

  assert.equal(parsed.payload.licenseKeyHash, payload.licenseKeyHash);
  assert.equal(licenseVerificationService.verify(parsed.payload, signature).signatureValid, true);
});

test("issueLicenseSchema supports temporary and permanent license kinds", () => {
  const temporary = issueLicenseSchema.parse({
    deviceId: "11111111-1111-1111-1111-111111111111",
    contractId: "22222222-2222-2222-2222-222222222222",
    licenseType: "temporary",
    expiresAt: "2027-01-01T00:00:00.000Z"
  });

  const permanent = issueLicenseSchema.parse({
    deviceId: "33333333-3333-3333-3333-333333333333",
    contractId: "44444444-4444-4444-4444-444444444444",
    licenseType: "permanent"
  });

  assert.equal(temporary.licenseType, "temporary");
  assert.equal(permanent.licenseType, "permanent");
  assert.equal(permanent.expiresAt, undefined);
});

test("verificationService enforces temporary expiry and allows permanent lifetime licenses", () => {
  const now = Date.now();

  const validTemporary = {
    licenseId: "d3d4d0d6-7f8c-4e3d-bda6-0d37cc0c4a0f",
    deviceId: "11111111-1111-1111-1111-111111111111",
    contractId: "22222222-2222-2222-2222-222222222222",
    issuedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
    licenseType: "temporary" as const,
    keyId: "default",
    algorithm: "RSA-SHA256" as const
  };

  const temporarySignature = licenseSigningService.sign(validTemporary);
  const temporaryResult = licenseVerificationService.verify(validTemporary, temporarySignature);
  assert.equal(temporaryResult.valid, true);

  const expiredTemporary = {
    ...validTemporary,
    expiresAt: new Date(now - 60_000).toISOString()
  };
  const expiredSignature = licenseSigningService.sign(expiredTemporary);
  const expiredResult = licenseVerificationService.verify(expiredTemporary, expiredSignature);
  assert.equal(expiredResult.valid, false);
  assert.equal(expiredResult.notExpired, false);

  const permanent = {
    ...validTemporary,
    licenseId: "e4d5d1d7-8f9d-4f4e-acde-1d38cc1d5b1f",
    deviceId: "33333333-3333-3333-3333-333333333333",
    contractId: "44444444-4444-4444-4444-444444444444",
    licenseType: "permanent" as const,
    expiresAt: undefined
  };

  const permanentSignature = licenseSigningService.sign(permanent);
  const permanentResult = licenseVerificationService.verify(permanent, permanentSignature);
  assert.equal(permanentResult.valid, true);
  assert.equal(permanentResult.licenseType, "permanent");
});

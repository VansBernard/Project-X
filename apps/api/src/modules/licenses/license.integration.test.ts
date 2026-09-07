import assert from "node:assert/strict";
import test from "node:test";
import { licenseSigningService } from "./signing.service.js";
import { licenseVerificationService } from "./verification.service.js";
import type { LicensePayload } from "./license.schemas.js";

test("API generates signed payload and the desktop verification contract accepts it", () => {
  const payload: LicensePayload = {
    licenseId: "f1a2b3c4-5678-90ab-cdef-1234567890ab",
    deviceId: "11111111-1111-1111-1111-111111111111",
    contractId: "22222222-2222-2222-2222-222222222222",
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    licenseType: "temporary",
    keyId: "default",
    algorithm: "RSA-SHA256"
  };

  const signature = licenseSigningService.sign(payload);
  assert.equal(typeof signature, "string");
  assert(signature.length > 0, "Expected a non-empty signature");

  assert.equal(payload.licenseId, "f1a2b3c4-5678-90ab-cdef-1234567890ab");
  assert.equal(payload.deviceId, "11111111-1111-1111-1111-111111111111");
  assert.equal(payload.contractId, "22222222-2222-2222-2222-222222222222");
  assert.equal(payload.licenseType, "temporary");
  assert.equal(payload.keyId, "default");
  assert.equal(payload.algorithm, "RSA-SHA256");

  const verification = licenseVerificationService.verify(payload, signature);
  assert.equal(verification.valid, true);
  assert.equal(verification.signatureValid, true);
  assert.equal(verification.notExpired, true);
  assert.equal(verification.issued, true);
});

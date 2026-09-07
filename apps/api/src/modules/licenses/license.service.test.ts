import assert from "node:assert/strict";
import test from "node:test";
import { licenseService } from "./license.service.js";
import { licenseVerificationService } from "./verification.service.js";
import { licenseSigningService } from "./signing.service.js";
import { verifyLicenseSchema } from "./license.schemas.js";
import { prisma } from "../../lib/prisma.js";

function restorePrisma(originals: Record<string, any>) {
  for (const [key, value] of Object.entries(originals)) {
    (prisma as any)[key] = value;
  }
}

test("licenseService.issue creates a permanent license with a valid signature", async () => {
  const dealerId = "test-dealer-id";
  const contractId = "test-contract-id";
  const deviceId = "test-device-id";
  const contractRecord = {
    id: contractId,
    dealerId,
    customerId: "test-customer-id",
    deviceId,
    status: "active",
    device: { deletedAt: null, hardwareFingerprint: "fp-test-device" }
  };

  const createdLicense = {
    id: "test-license-id",
    dealerId,
    customerId: contractRecord.customerId,
    deviceId,
    contractId,
    licenseKey: "00000000000000000000",
    keyId: "default",
    signatureAlgorithm: "RSA-SHA256",
    status: "active",
    issuedAt: new Date(),
    expiresAt: null,
    licenseType: "permanent",
    metadata: {},
    signedPayload: {},
    signature: ""
  };

  const originals = {
    contract: prisma.contract,
    license: prisma.license
  };

  const mockContractFindFirst = async () => contractRecord;
  const mockLicenseCreate = async () => createdLicense;
  const mockLicenseUpdate = async ({ data }: { data: Record<string, unknown> }) => ({
    ...createdLicense,
    ...data
  });

  try {
    (prisma.contract as any).findFirst = mockContractFindFirst;
    (prisma.license as any).create = mockLicenseCreate;
    (prisma.license as any).update = mockLicenseUpdate;

    const issued = await licenseService.issue(dealerId, {
      deviceId,
      contractId,
      licenseType: "permanent",
      metadata: {}
    });

    const issuedPayload = issued.signedPayload as any;

    assert.equal(issued.licenseType, "permanent");
    assert.equal(issued.expiresAt, null);
    assert.equal(issuedPayload.licenseType, "permanent");
    assert.equal(issuedPayload.keyId, "default");
    assert.equal(typeof issued.signature, "string");
    assert.ok(issued.signature.length > 0);

    const verification = licenseVerificationService.verify(issued.signedPayload as any, issued.signature);
    assert.equal(verification.valid, true);
    assert.equal(verification.licenseType, "permanent");
  } finally {
    restorePrisma({
      contract: originals.contract,
      license: originals.license
    });
  }
});

test("licenseService.issue creates a temporary license with expiry and valid signature", async () => {
  const dealerId = "test-dealer-id";
  const contractId = "test-contract-id";
  const deviceId = "test-device-id";
  const expiresAt = new Date(Date.now() + 60_000);
  const contractRecord = {
    id: contractId,
    dealerId,
    customerId: "test-customer-id",
    deviceId,
    status: "active",
    device: { deletedAt: null, hardwareFingerprint: "fp-test-device" }
  };

  const createdLicense = {
    id: "test-temporary-license-id",
    dealerId,
    customerId: contractRecord.customerId,
    deviceId,
    contractId,
    licenseKey: "11111111111111111111",
    keyId: "default",
    signatureAlgorithm: "RSA-SHA256",
    status: "active",
    issuedAt: new Date(),
    expiresAt,
    licenseType: "temporary",
    metadata: {},
    signedPayload: {},
    signature: ""
  };

  const originals = {
    contract: prisma.contract,
    license: prisma.license
  };

  const mockContractFindFirst = async () => contractRecord;
  const mockLicenseCreate = async () => createdLicense;
  const mockLicenseUpdate = async ({ data }: { data: Record<string, unknown> }) => ({
    ...createdLicense,
    ...data
  });

  try {
    (prisma.contract as any).findFirst = mockContractFindFirst;
    (prisma.license as any).create = mockLicenseCreate;
    (prisma.license as any).update = mockLicenseUpdate;

    const issued = await licenseService.issue(dealerId, {
      deviceId,
      contractId,
      licenseType: "temporary",
      expiresAt,
      metadata: {}
    });

    const issuedPayload = issued.signedPayload as any;

    assert.equal(issued.licenseType, "temporary");
    assert.ok(issuedPayload.expiresAt);
    assert.equal(issuedPayload.keyId, "default");
    assert.equal(typeof issued.signature, "string");
    assert.ok(issued.signature.length > 0);

    const verification = licenseVerificationService.verify(issued.signedPayload as any, issued.signature);
    assert.equal(verification.valid, true);
    assert.equal(verification.notExpired, true);
  } finally {
    restorePrisma({
      contract: originals.contract,
      license: originals.license
    });
  }
});

test("licenseService.verify returns a valid license when verifying by license key", async () => {
  const dealerId = "test-dealer-id";
  const contractId = "test-contract-id";
  const deviceId = "test-device-id";
  const licenseKey = "license-key-123";
  const payload = {
    licenseId: "test-license-key-id",
    deviceId,
    contractId,
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    licenseType: "temporary",
    keyId: "default",
    algorithm: "RSA-SHA256"
  } as const;

  const signature = licenseSigningService.sign(payload);
  const licenseRecord = {
    id: payload.licenseId,
    dealerId,
    customerId: "test-customer-id",
    deviceId,
    contractId,
    licenseKey,
    keyId: payload.keyId,
    signatureAlgorithm: payload.algorithm,
    signedPayload: payload,
    signature,
    status: "active",
    issuedAt: new Date(payload.issuedAt),
    expiresAt: new Date(payload.expiresAt),
    licenseType: payload.licenseType,
    deletedAt: null
  };

  const originalFindMany = prisma.license.findMany;

  try {
    (prisma.license as any).findMany = async () => [licenseRecord];

    const result = await licenseService.verify(dealerId, {
      deviceId,
      contractId,
      licenseKey
    });

    assert.equal(result.valid, true);
    assert.equal((result as any).licenseId, payload.licenseId);
    assert.equal((result as any).verification?.signatureValid, true);
  } finally {
    (prisma.license as any).findMany = originalFindMany;
  }
});

test("licenseService.verify accepts a signed payload directly", async () => {
  const payload = {
    licenseId: "test-signed-license-id",
    deviceId: "test-device-id",
    contractId: "test-contract-id",
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    licenseType: "temporary",
    keyId: "default",
    algorithm: "RSA-SHA256"
  } as const;

  const signature = licenseSigningService.sign(payload);
  const result = await licenseService.verify("test-dealer-id", {
    payload,
    signature
  });

  assert.equal(result.valid, true);
  assert.equal((result as any).signatureValid, true);
  assert.equal((result as any).licenseType, "temporary");
});

test("issued payload remains valid after direct-verification request parsing", async () => {
  const payload = {
    licenseId: "f1a2b3c4-5678-90ab-cdef-1234567890ab",
    deviceId: "11111111-1111-1111-1111-111111111111",
    contractId: "22222222-2222-2222-2222-222222222222",
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    licenseType: "temporary" as const,
    keyId: "default",
    algorithm: "RSA-SHA256" as const,
    licenseKeyHash: "b".repeat(64)
  };
  const signature = licenseSigningService.sign(payload);
  const parsed = verifyLicenseSchema.parse({ payload, signature });

  if (!("payload" in parsed)) {
    throw new Error("Expected signed-payload verification input.");
  }

  const result = await licenseService.verify("test-dealer-id", parsed);
  assert.equal(result.valid, true);
  assert.ok("signatureValid" in result);
  assert.equal(result.signatureValid, true);
});

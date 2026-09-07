import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { DeviceRecoveryAuthorizationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { canonicalJson } from "../licenses/canonical-json.js";
import { AppError } from "../../middleware/error.middleware.js";
import { recoveryService } from "./recovery.service.js";

function restorePrisma(originals: Record<string, unknown>) {
  for (const [key, value] of Object.entries(originals)) {
    (prisma as any)[key] = value;
  }
}

test("recoveryService.createAuthorization issues a signed temporary recovery payload", async () => {
  const dealerId = "11111111-1111-4111-8111-111111111111";
  const actorUserId = "22222222-2222-4222-8222-222222222222";
  const deviceId = "33333333-3333-4333-8333-333333333333";
  const recoveryId = `PX-${crypto.createHash("sha256").update(deviceId).digest("hex").slice(0, 12).toUpperCase()}`;

  const originalEnv = { ...env };
  const keyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  const originals = {
    device: prisma.device,
    deviceRecoveryAuthorization: prisma.deviceRecoveryAuthorization,
    auditLog: prisma.auditLog
  };

  const createdAuth: Record<string, unknown> = {};

  try {
    (env as any).RECOVERY_PRIVATE_KEY_PEM_BASE64 = Buffer.from(keyPair.privateKey, "utf8").toString("base64");
    (env as any).RECOVERY_KEY_ID = "recovery-test-key";

    (prisma.device as any).findMany = async () => [{ id: deviceId, status: "assigned" }];
    (prisma.deviceRecoveryAuthorization as any).findFirst = async () => null;
    (prisma.deviceRecoveryAuthorization as any).create = async ({ data }: { data: Record<string, unknown> }) => {
      createdAuth.id = data.id;
      createdAuth.deviceId = data.deviceId;
      createdAuth.challenge = data.challenge;
      createdAuth.status = data.status;
      createdAuth.issuedAt = data.issuedAt;
      createdAuth.expiresAt = data.expiresAt;
      return {
        id: data.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    };
    (prisma.auditLog as any).create = async ({ data }: { data: Record<string, unknown> }) => data;

    const result = await recoveryService.createAuthorization(
      dealerId,
      actorUserId,
      { recoveryId },
      { ipAddress: "127.0.0.1", userAgent: "node-test" }
    );

    assert.equal(result.deviceId, deviceId);
    assert.equal(result.recoveryId, recoveryId);
    assert.equal(result.recoveryDurationHours, 36);
    assert.ok(result.authorization.includes("."));

    const [encodedPayload, signature] = result.authorization.split(".");
    const decodedPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

    assert.equal(decodedPayload.deviceId, deviceId);
    assert.equal(decodedPayload.dealerId, dealerId);
    assert.equal(decodedPayload.challenge, recoveryId);
    assert.equal(decodedPayload.authorizationType, "temporary_recovery");
    assert.equal(decodedPayload.recoveryDurationHours, 36);

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(canonicalJson(decodedPayload));
    verifier.end();
    assert.equal(verifier.verify(keyPair.publicKey, signature, "base64"), true);
    assert.equal((createdAuth.status as any), DeviceRecoveryAuthorizationStatus.issued);
  } finally {
    Object.assign(env, originalEnv);
    restorePrisma({
      device: originals.device,
      deviceRecoveryAuthorization: originals.deviceRecoveryAuthorization,
      auditLog: originals.auditLog
    });
  }
});

test("recoveryService.createAuthorization rejects a second active authorization for the same device", async () => {
  const dealerId = "11111111-1111-4111-8111-111111111111";
  const actorUserId = "22222222-2222-4222-8222-222222222222";
  const deviceId = "33333333-3333-4333-8333-333333333333";

  const originalEnv = { ...env };
  const keyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  const originals = {
    device: prisma.device,
    deviceRecoveryAuthorization: prisma.deviceRecoveryAuthorization,
    auditLog: prisma.auditLog
  };

  try {
    (env as any).RECOVERY_PRIVATE_KEY_PEM_BASE64 = Buffer.from(keyPair.privateKey, "utf8").toString("base64");
    (env as any).RECOVERY_KEY_ID = "recovery-test-key";

    (prisma.device as any).findMany = async () => [{ id: deviceId, status: "assigned" }];
    (prisma.deviceRecoveryAuthorization as any).findFirst = async () => ({
      id: "existing-auth-id",
      deviceId,
      dealerId,
      status: DeviceRecoveryAuthorizationStatus.issued,
      expiresAt: new Date(Date.now() + 60_000)
    });

    await assert.rejects(
      () =>
        recoveryService.createAuthorization(
          dealerId,
          actorUserId,
          { recoveryId: `PX-${crypto.createHash("sha256").update(deviceId).digest("hex").slice(0, 12).toUpperCase()}` },
          { ipAddress: "127.0.0.1", userAgent: "node-test" }
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal((error as any).statusCode, 409);
        assert.equal((error as any).code, "RECOVERY_ALREADY_ISSUED");
        return true;
      }
    );
  } finally {
    Object.assign(env, originalEnv);
    restorePrisma({
      device: originals.device,
      deviceRecoveryAuthorization: originals.deviceRecoveryAuthorization,
      auditLog: originals.auditLog
    });
  }
});

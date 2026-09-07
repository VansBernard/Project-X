import crypto from "node:crypto";
import { DeviceRecoveryAuthorizationStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.middleware.js";
import { env } from "../../config/env.js";
import { recoverySigningService } from "./recovery-signing.service.js";
import type { CreateRecoveryAuthorizationInput } from "./recovery.schemas.js";

const AUTHORIZATION_TTL_MINUTES = 30;
const RECOVERY_DURATION_HOURS = 36;

function recoveryId(deviceId: string) {
  return `PX-${crypto.createHash("sha256").update(deviceId).digest("hex").slice(0, 12).toUpperCase()}`;
}

function authorizationCode(payload: Record<string, unknown>, signature: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${signature}`;
}

export const recoveryService = {
  async createAuthorization(dealerId: string, actorUserId: string, input: CreateRecoveryAuthorizationInput, requestMetadata: { ipAddress?: string; userAgent?: string }) {
    const devices = await prisma.device.findMany({
      where: { dealerId, deletedAt: null },
      select: { id: true, status: true }
    });
    const device = devices.find((candidate) => recoveryId(candidate.id) === input.recoveryId.toUpperCase());

    if (!device) {
      throw new AppError(404, "DEVICE_NOT_FOUND", "The device was not found for this dealer.");
    }

    const existing = await prisma.deviceRecoveryAuthorization.findFirst({
      where: {
        dealerId,
        deviceId: device.id,
        status: DeviceRecoveryAuthorizationStatus.issued,
        expiresAt: { gt: new Date() }
      }
    });

    if (existing) {
      throw new AppError(409, "RECOVERY_ALREADY_ISSUED", "An active recovery authorization already exists for this device.");
    }

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + AUTHORIZATION_TTL_MINUTES * 60 * 1000);
    const id = crypto.randomUUID();
    const payload = {
      authorizationId: id,
      deviceId: device.id,
      dealerId,
      challenge: input.recoveryId.toUpperCase(),
      authorizationType: "temporary_recovery",
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      recoveryDurationHours: RECOVERY_DURATION_HOURS,
      keyId: env.RECOVERY_KEY_ID,
      algorithm: "RSA-SHA256"
    };
    const signature = recoverySigningService.sign(payload);

    const authorization = await prisma.deviceRecoveryAuthorization.create({
      data: {
        id: crypto.randomUUID(),
        dealerId,
        deviceId: device.id,
        challenge: input.recoveryId.toUpperCase(),
        status: DeviceRecoveryAuthorizationStatus.issued,
        issuedAt,
        expiresAt,
        signedPayload: payload as Prisma.InputJsonValue,
        signature
      }
    });

    await prisma.auditLog.create({
      data: {
        dealerId,
        actorType: "user",
        actorUserId,
        deviceId: device.id,
        action: "DEVICE_RECOVERY_AUTHORIZATION_ISSUED",
        entityType: "DeviceRecoveryAuthorization",
        entityId: authorization.id,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: { authorizationId: id, expiresAt: expiresAt.toISOString() }
      }
    });

    return {
      authorizationId: id,
      deviceId: device.id,
      recoveryId: input.recoveryId.toUpperCase(),
      authorization: authorizationCode(payload, signature),
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      recoveryDurationHours: RECOVERY_DURATION_HOURS
    };
  }
};
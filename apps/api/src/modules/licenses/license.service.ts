import crypto from "node:crypto";
import { ContractStatus, LicenseStatus, Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";
import { prisma } from "../../lib/prisma.js";
import { licenseSigningService } from "./signing.service.js";
import { licenseVerificationService } from "./verification.service.js";
import type { IssueLicenseInput, LicensePayload, VerifyLicenseInput } from "./license.schemas.js";

function assertFutureDate(date: Date) {
  if (date.getTime() <= Date.now()) {
    throw new AppError(400, "INVALID_LICENSE_EXPIRATION", "License expiration date must be in the future.");
  }
}

function payloadFromRecord(record: {
  id: string;
  deviceId: string;
  contractId: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  keyId: string;
  signatureAlgorithm: string;
}): LicensePayload {
  if (!record.contractId || !record.issuedAt || !record.expiresAt) {
    throw new AppError(500, "INVALID_LICENSE_RECORD", "License record is missing required signed fields.");
  }

  return {
    licenseId: record.id,
    deviceId: record.deviceId,
    contractId: record.contractId,
    issuedAt: record.issuedAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    keyId: record.keyId,
    algorithm: "RSA-SHA256"
  };
}

export const licenseService = {
  async issue(dealerId: string, input: IssueLicenseInput) {
    assertFutureDate(input.expiresAt);

    const contract = await prisma.contract.findFirst({
      where: {
        id: input.contractId,
        dealerId,
        deviceId: input.deviceId,
        deletedAt: null
      },
      include: {
        customer: true,
        device: true
      }
    });

    if (!contract) {
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract for device was not found.");
    }

    if (contract.status !== ContractStatus.active && contract.status !== ContractStatus.completed) {
      throw new AppError(400, "CONTRACT_NOT_ELIGIBLE", "Only active or completed contracts can receive licenses.");
    }

    if (!contract.device || contract.device.deletedAt) {
      throw new AppError(404, "DEVICE_NOT_FOUND", "Assigned device was not found.");
    }

    const issuedAt = new Date();
    const license = await prisma.license.create({
      data: {
        dealerId,
        customerId: contract.customerId,
        deviceId: input.deviceId,
        contractId: input.contractId,
        licenseKey: crypto.randomUUID(),
        keyId: env.LICENSE_KEY_ID,
        signedPayload: {},
        signature: "",
        signatureAlgorithm: "RSA-SHA256",
        status: LicenseStatus.active,
        issuedAt,
        expiresAt: input.expiresAt,
        metadata: input.metadata as Prisma.JsonObject
      }
    });

    const payload: LicensePayload = {
      licenseId: license.id,
      deviceId: input.deviceId,
      contractId: input.contractId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
      keyId: env.LICENSE_KEY_ID,
      algorithm: "RSA-SHA256"
    };
    const signature = licenseSigningService.sign(payload);

    return prisma.license.update({
      where: { id: license.id },
      data: {
        signedPayload: payload as unknown as Prisma.JsonObject,
        signature
      }
    });
  },

  async verify(input: VerifyLicenseInput) {
    return licenseVerificationService.verify(input.payload, input.signature);
  },

  async detail(dealerId: string, licenseId: string) {
    const license = await prisma.license.findFirst({
      where: {
        id: licenseId,
        dealerId,
        deletedAt: null
      },
      include: {
        device: true,
        contract: true,
        customer: true
      }
    });

    if (!license) {
      throw new AppError(404, "LICENSE_NOT_FOUND", "License was not found.");
    }

    return license;
  },

  async activeForDevice(dealerId: string, deviceId: string) {
    const licenses = await prisma.license.findMany({
      where: {
        dealerId,
        deviceId,
        status: LicenseStatus.active,
        expiresAt: { gt: new Date() },
        deletedAt: null
      },
      orderBy: { expiresAt: "desc" }
    });

    for (const license of licenses) {
      const payload = payloadFromRecord(license);
      const verification = licenseVerificationService.verify(payload, license.signature);

      if (verification.valid) {
        return {
          unlockAllowed: true,
          license,
          verification
        };
      }
    }

    return {
      unlockAllowed: false,
      license: null,
      verification: null
    };
  }
};

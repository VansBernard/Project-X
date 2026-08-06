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
  licenseType?: "temporary" | "permanent" | null;
}): LicensePayload {
  if (!record.contractId || !record.issuedAt) {
    throw new AppError(500, "INVALID_LICENSE_RECORD", "License record is missing required signed fields.");
  }

  return {
    licenseId: record.id,
    deviceId: record.deviceId,
    contractId: record.contractId,
    issuedAt: record.issuedAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString(),
    licenseType: record.licenseType ?? "temporary",
    keyId: record.keyId,
    algorithm: "RSA-SHA256"
  };
}

export const licenseService = {
  async issue(dealerId: string, input: IssueLicenseInput) {
    if (input.licenseType === "temporary") {
      if (!input.expiresAt) {
        throw new AppError(400, "INVALID_LICENSE_EXPIRATION", "Temporary licenses require an expiration timestamp.");
      }
      assertFutureDate(input.expiresAt);
    } else if (input.expiresAt) {
      assertFutureDate(input.expiresAt);
    }

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

    function generateNumericKey(len = 20) {
      let out = '';
      for (let i = 0; i < len; i++) {
        out += String(crypto.randomInt(0, 10));
      }
      return out;
    }

    console.info("[licenseService.issue] creating license", {
      dealerId,
      contractId: input.contractId,
      deviceId: input.deviceId,
      customerId: contract.customerId,
      licenseType: input.licenseType,
      expiresAt: input.expiresAt?.toISOString()
    });

    const license = await prisma.license.create({
      data: {
        dealerId,
        customerId: contract.customerId,
        deviceId: input.deviceId,
        contractId: input.contractId,
        licenseKey: generateNumericKey(20),
        keyId: env.LICENSE_KEY_ID,
        signedPayload: {},
        signature: "",
        signatureAlgorithm: "RSA-SHA256",
        status: LicenseStatus.active,
        issuedAt,
        expiresAt: input.expiresAt,
        licenseType: input.licenseType,
        metadata: input.metadata as Prisma.JsonObject
      }
    });

    console.info("[licenseService.issue] license created", {
      licenseId: license.id,
      dealerId: license.dealerId,
      contractId: license.contractId,
      deviceId: license.deviceId,
      licenseType: license.licenseType
    });

    const payload: LicensePayload = {
      licenseId: license.id,
      deviceId: input.deviceId,
      contractId: input.contractId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: input.expiresAt?.toISOString(),
      licenseType: input.licenseType,
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

  async verify(dealerId: string, input: VerifyLicenseInput) {
    if ("payload" in input && "signature" in input) {
      return licenseVerificationService.verify(input.payload, input.signature);
    }

    const licenses = await prisma.license.findMany({
      where: {
        dealerId,
        deviceId: input.deviceId,
        contractId: input.contractId,
        licenseKey: input.licenseKey,
        status: LicenseStatus.active,
        deletedAt: null,
        OR: [
          { licenseType: "temporary", expiresAt: { gt: new Date() } },
          { licenseType: "permanent" }
        ]
      },
      orderBy: { expiresAt: "desc" }
    });

    for (const license of licenses) {
      const payload = payloadFromRecord(license);
      const verification = licenseVerificationService.verify(payload, license.signature);
      if (verification.valid) {
        return {
          valid: true,
          deviceId: input.deviceId,
          contractId: input.contractId,
          expiresAt: payload.expiresAt,
          licenseId: payload.licenseId,
          verification
        };
      }
    }

    return {
      valid: false,
      deviceId: input.deviceId,
      contractId: input.contractId,
      expiresAt: null,
      licenseId: null,
      verification: null
    };
  },

  async list(dealerId: string, params: {
    take?: number;
    cursor?: string;
    status?: LicenseStatus;
    deviceId?: string;
    contractId?: string;
    customerId?: string;
  }) {
    const where: Record<string, unknown> = {
      dealerId,
      deletedAt: null
    };

    if (params.status) {
      Object.assign(where, { status: params.status });
    }
    if (params.deviceId) {
      Object.assign(where, { deviceId: params.deviceId });
    }
    if (params.contractId) {
      Object.assign(where, { contractId: params.contractId });
    }
    if (params.customerId) {
      Object.assign(where, { customerId: params.customerId });
    }

    return prisma.license.findMany({
      where,
      include: {
        customer: true,
        device: true,
        contract: true
      },
      orderBy: { createdAt: "desc" },
      take: params.take ?? 100,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined
    });
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
        deletedAt: null,
        OR: [
          { licenseType: "temporary", expiresAt: { gt: new Date() } },
          { licenseType: "permanent" }
        ]
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

import { ContractStatus, LicenseDeliveryStatus, PaymentStatus } from "@prisma/client";
import { env } from "../../../config/env.js";
import { AppError } from "../../../middleware/error.middleware.js";
import { prisma } from "../../../lib/prisma.js";
import { licenseService } from "../license.service.js";
import { emailService } from "./email.service.js";

function nextRetryAt(attempts: number) {
  const minutes = Math.min(120, 2 ** Math.max(attempts, 1));
  return new Date(Date.now() + minutes * 60 * 1000);
}

function customerName(customer: { fullName: string | null; firstName: string; lastName: string }) {
  return customer.fullName || `${customer.firstName} ${customer.lastName}`.trim();
}

function deviceInformation(device: { manufacturer: string | null; model: string | null; serialNumber: string }) {
  return [device.manufacturer, device.model, `Serial: ${device.serialNumber}`]
    .filter(Boolean)
    .join(" ");
}

function paymentInformation(payment: { amount: unknown; currency: string; providerReference: string }) {
  return `${payment.currency} ${payment.amount} - Ref: ${payment.providerReference}`;
}

function licenseExpiration(payment: {
  contract: { metadata: unknown } | null;
}) {
  const plan = payment.contract?.metadata && typeof payment.contract.metadata === "object" && !Array.isArray(payment.contract.metadata)
    ? (payment.contract.metadata as Record<string, unknown>).paymentPlan
    : undefined;
  const validityDays = plan === "weekly" ? 7 : plan === "yearly" ? 365 : 30;

  // Each successful payment starts a fresh, fixed unlock window. This prevents
  // a missed payment from inheriting an old future due-date as its expiry.
  return new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
}

export const licenseDeliveryService = {
  async enqueueForPayment(paymentId: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        status: PaymentStatus.successful,
        deletedAt: null
      }
    });

    if (!payment) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Successful payment was not found.");
    }

    return prisma.licenseDeliveryJob.upsert({
      where: { paymentId },
      create: {
        dealerId: payment.dealerId,
        paymentId: payment.id,
        status: LicenseDeliveryStatus.queued
      },
      update: {
        status: LicenseDeliveryStatus.queued,
        nextRetryAt: null,
        lastError: null
      }
    });
  },

  async processJob(jobId: string) {
    const job = await prisma.licenseDeliveryJob.findFirst({
      where: {
        id: jobId,
        deletedAt: null
      },
      include: {
        payment: {
          include: {
            customer: true,
            contract: {
              include: {
                device: true
              }
            }
          }
        }
      }
    });

    if (!job) {
      throw new AppError(404, "LICENSE_DELIVERY_JOB_NOT_FOUND", "License delivery job was not found.");
    }

    if (job.status === LicenseDeliveryStatus.sent) {
      return job;
    }

    const claim = await prisma.licenseDeliveryJob.updateMany({
      where: {
        id: job.id,
        deletedAt: null,
        status: {
          in: [LicenseDeliveryStatus.queued, LicenseDeliveryStatus.retrying]
        }
      },
      data: {
        status: LicenseDeliveryStatus.processing,
        attempts: { increment: 1 }
      }
    });

    if (claim.count !== 1) {
      const currentJob = await prisma.licenseDeliveryJob.findFirst({
        where: { id: job.id, deletedAt: null }
      });

      if (currentJob?.status === LicenseDeliveryStatus.sent) {
        return currentJob;
      }

      throw new AppError(409, "LICENSE_DELIVERY_IN_PROGRESS", "License delivery is already being processed.");
    }

    const processingAttempts = job.attempts + 1;

    try {
      const payment = job.payment;

      if (payment.status !== PaymentStatus.successful) {
        throw new AppError(400, "PAYMENT_NOT_SUCCESSFUL", "License delivery requires a successful payment.");
      }

      if (!payment.customer.email) {
        throw new AppError(400, "CUSTOMER_EMAIL_REQUIRED", "Customer email is required for license delivery.");
      }

      if (!payment.contract?.deviceId || !payment.contract.device) {
        throw new AppError(400, "PAYMENT_CONTRACT_DEVICE_REQUIRED", "Payment contract must have an assigned device.");
      }

      const licenseType = payment.contract?.status === ContractStatus.completed ? "permanent" : "temporary";
      let license =
        job.licenseId
          ? await prisma.license.findFirst({
              where: {
                id: job.licenseId,
                dealerId: job.dealerId,
                deletedAt: null
              }
            })
          : null;

      // The permanent recovery key is created at registration and remains
      // visible to the dealer as pending until the one-time payment completes.
      if (!license && licenseType === "permanent") {
        license = await prisma.license.findFirst({
          where: {
            dealerId: job.dealerId,
            customerId: payment.customerId,
            deviceId: payment.contract.deviceId,
            contractId: payment.contract.id,
            licenseType: "permanent",
            status: "pending",
            deletedAt: null
          },
          orderBy: { createdAt: "asc" }
        });

        if (license) {
          license = await prisma.license.update({
            where: { id: license.id },
            data: { status: "active", issuedAt: new Date() }
          });
        }
      }

      if (!license && licenseType === "temporary") {
        const pendingVouchers = await prisma.license.findMany({
          where: {
            dealerId: job.dealerId,
            customerId: payment.customerId,
            deviceId: payment.contract.deviceId,
            contractId: payment.contract.id,
            licenseType: "temporary",
            status: "pending",
            deletedAt: null
          },
          orderBy: { createdAt: "asc" }
        });
        const now = new Date();
        const voucher = pendingVouchers.find((candidate) => {
          const metadata = candidate.metadata;
          return candidate.expiresAt && candidate.expiresAt > now
            && metadata && typeof metadata === "object" && !Array.isArray(metadata)
            && (metadata as Record<string, unknown>).source === "desktop-registration-voucher";
        });

        if (voucher) {
          license = await prisma.license.update({
            where: { id: voucher.id },
            data: { status: "active", issuedAt: new Date() }
          });
        }
      }

      if (!license) {
        license = await licenseService.issue(job.dealerId, {
              deviceId: payment.contract.deviceId,
              contractId: payment.contract.id,
              licenseType,
              expiresAt: licenseType === "temporary" ? licenseExpiration(payment) : undefined,
              metadata: {
                source: "successful_payment",
                paymentId: payment.id,
                paymentReference: payment.providerReference
              }
            });
      }

      if (!license) {
        throw new AppError(500, "LICENSE_NOT_AVAILABLE", "License could not be created or loaded.");
      }

      await emailService.sendLicenseEmail({
        to: payment.customer.email,
        customerName: customerName(payment.customer),
        deviceInformation: deviceInformation(payment.contract.device),
        paymentInformation: paymentInformation(payment),
        expirationDate: licenseType === "permanent" ? "Permanent unlock license" : license.expiresAt?.toISOString() ?? "",
        licenseKey: license.licenseKey,
        licenseType
      });

      return prisma.licenseDeliveryJob.update({
        where: { id: job.id },
        data: {
          licenseId: license.id,
          status: LicenseDeliveryStatus.sent,
          sentAt: new Date(),
          nextRetryAt: null,
          lastError: null
        }
      });
    } catch (error) {
      const attempts = processingAttempts;
      const retryable = attempts < env.LICENSE_DELIVERY_MAX_ATTEMPTS;

      await prisma.licenseDeliveryJob.update({
        where: { id: job.id },
        data: {
          status: retryable ? LicenseDeliveryStatus.retrying : LicenseDeliveryStatus.failed,
          nextRetryAt: retryable ? nextRetryAt(attempts) : null,
          lastError: error instanceof Error ? error.message : "License delivery failed."
        }
      });

      throw error;
    }
  },

  async enqueueAndProcess(paymentId: string) {
    const job = await this.enqueueForPayment(paymentId);
    return this.processJob(job.id);
  },

  async processDueRetries(limit = 25) {
    const jobs = await prisma.licenseDeliveryJob.findMany({
      where: {
        status: LicenseDeliveryStatus.retrying,
        nextRetryAt: { lte: new Date() },
        deletedAt: null
      },
      orderBy: { nextRetryAt: "asc" },
      take: limit
    });

    const results = [];

    for (const job of jobs) {
      try {
        results.push(await this.processJob(job.id));
      } catch {
        results.push({ id: job.id, status: "failed_attempt" });
      }
    }

    return results;
  }
};

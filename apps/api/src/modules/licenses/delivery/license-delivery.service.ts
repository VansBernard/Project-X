import { LicenseDeliveryStatus, PaymentStatus } from "@prisma/client";
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
  contract: {
    nextDueDate: Date | null;
    endDate: Date | null;
  } | null;
}) {
  const now = new Date();
  const configured = payment.contract?.nextDueDate ?? payment.contract?.endDate;

  if (configured && configured.getTime() > now.getTime()) {
    return configured;
  }

  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
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

    const processingJob = await prisma.licenseDeliveryJob.update({
      where: { id: job.id },
      data: {
        status: LicenseDeliveryStatus.processing,
        attempts: { increment: 1 }
      }
    });

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

      const license =
        job.licenseId
          ? await prisma.license.findFirst({
              where: {
                id: job.licenseId,
                dealerId: job.dealerId,
                deletedAt: null
              }
            })
          : await licenseService.issue(job.dealerId, {
              deviceId: payment.contract.deviceId,
              contractId: payment.contract.id,
              expiresAt: licenseExpiration(payment),
              metadata: {
                source: "successful_payment",
                paymentId: payment.id,
                paymentReference: payment.providerReference
              }
            });

      if (!license) {
        throw new AppError(500, "LICENSE_NOT_AVAILABLE", "License could not be created or loaded.");
      }

      await emailService.sendLicenseEmail({
        to: payment.customer.email,
        customerName: customerName(payment.customer),
        deviceInformation: deviceInformation(payment.contract.device),
        paymentInformation: paymentInformation(payment),
        expirationDate: license.expiresAt?.toISOString() ?? "",
        licenseKey: license.licenseKey
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
      const attempts = processingJob.attempts;
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

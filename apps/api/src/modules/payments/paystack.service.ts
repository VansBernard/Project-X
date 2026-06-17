import crypto from "node:crypto";
import {
  PaymentAttemptStatus,
  PaymentAttemptType,
  PaymentProvider,
  PaymentStatus,
  PaymentWebhookStatus,
  Prisma
} from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";
import { prisma } from "../../lib/prisma.js";
import { licenseDeliveryService } from "../licenses/delivery/license-delivery.service.js";
import { paystackClient } from "./paystack.client.js";
import type { InitializePaymentInput, ValidatePaymentInput } from "./paystack.schemas.js";

function amountToKobo(amount: number) {
  return Math.round(amount * 100);
}

function koboToAmount(amount: number) {
  return amount / 100;
}

function nextRetryAt(attemptNumber: number) {
  const minutes = Math.min(60, 2 ** attemptNumber);
  return new Date(Date.now() + minutes * 60 * 1000);
}

function generateReference(dealerId: string) {
  return `PX-${dealerId.slice(0, 8).toUpperCase()}-${crypto.randomBytes(10).toString("hex").toUpperCase()}`;
}

function verifySignature(rawBody: Buffer, signature?: string) {
  if (!signature) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (hash.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

function jsonObject(value: unknown): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Prisma.JsonObject)
    : {};
}

export const paystackService = {
  async initializePayment(dealerId: string, input: InitializePaymentInput) {
    const [customer, contract] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: input.customerId, dealerId, deletedAt: null }
      }),
      input.contractId
        ? prisma.contract.findFirst({
            where: { id: input.contractId, dealerId, customerId: input.customerId, deletedAt: null }
          })
        : Promise.resolve(null)
    ]);

    if (!customer) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer was not found.");
    }

    if (!customer.email) {
      throw new AppError(400, "CUSTOMER_EMAIL_REQUIRED", "Customer email is required to initialize Paystack payment.");
    }

    if (input.contractId && !contract) {
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract was not found.");
    }

    const reference = generateReference(dealerId);
    const metadata = {
      ...input.metadata,
      dealerId,
      customerId: input.customerId,
      contractId: input.contractId
    };

    const payment = await prisma.payment.create({
      data: {
        dealerId,
        customerId: input.customerId,
        contractId: input.contractId,
        provider: PaymentProvider.paystack,
        providerReference: reference,
        status: PaymentStatus.pending,
        currency: input.currency,
        amount: input.amount,
        metadata: metadata as Prisma.JsonObject
      }
    });

    try {
      const response = await paystackClient.initialize({
        email: customer.email,
        amountKobo: amountToKobo(input.amount),
        reference,
        currency: input.currency,
        callbackUrl: input.callbackUrl,
        metadata
      });

      await prisma.paymentAttempt.create({
        data: {
          dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.initialization,
          status: PaymentAttemptStatus.successful,
          providerReference: reference,
          requestPayload: {
            amount: input.amount,
            currency: input.currency,
            callbackUrl: input.callbackUrl
          },
          responsePayload: response.data as unknown as Prisma.JsonObject
        }
      });

      return {
        paymentId: payment.id,
        reference,
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        publicKey: env.PAYSTACK_PUBLIC_KEY
      };
    } catch (error) {
      await prisma.paymentAttempt.create({
        data: {
          dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.initialization,
          status: PaymentAttemptStatus.failed,
          providerReference: reference,
          errorCode: error instanceof AppError ? error.code : "PAYSTACK_INITIALIZATION_ERROR",
          errorMessage: error instanceof Error ? error.message : "Payment initialization failed.",
          nextRetryAt: nextRetryAt(1)
        }
      });

      throw error;
    }
  },

  async validatePayment(dealerId: string, input: ValidatePaymentInput) {
    const payment = await prisma.payment.findFirst({
      where: {
        dealerId,
        provider: PaymentProvider.paystack,
        providerReference: input.reference,
        deletedAt: null
      }
    });

    if (!payment) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found.");
    }

    try {
      const response = await paystackClient.verify(input.reference);

      await prisma.paymentAttempt.create({
        data: {
          dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.validation,
          status: PaymentAttemptStatus.successful,
          providerReference: input.reference,
          responsePayload: response.data as unknown as Prisma.JsonObject
        }
      });

      return {
        reference: input.reference,
        providerStatus: response.data.status,
        serverStatus: payment.status,
        trustedForSettlement: false,
        message: "Reference verified with Paystack. Payment state changes require a verified webhook."
      };
    } catch (error) {
      await prisma.paymentAttempt.create({
        data: {
          dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.validation,
          status: PaymentAttemptStatus.failed,
          providerReference: input.reference,
          errorCode: error instanceof AppError ? error.code : "PAYSTACK_VALIDATION_ERROR",
          errorMessage: error instanceof Error ? error.message : "Payment validation failed.",
          nextRetryAt: nextRetryAt(1)
        }
      });

      throw error;
    }
  },

  async retryInitialization(dealerId: string, input: ValidatePaymentInput) {
    const payment = await prisma.payment.findFirst({
      where: {
        dealerId,
        provider: PaymentProvider.paystack,
        providerReference: input.reference,
        status: PaymentStatus.pending,
        deletedAt: null
      },
      include: {
        customer: true
      }
    });

    if (!payment) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Pending payment was not found.");
    }

    if (!payment.customer.email) {
      throw new AppError(400, "CUSTOMER_EMAIL_REQUIRED", "Customer email is required to retry Paystack payment.");
    }

    const attemptCount = await prisma.paymentAttempt.count({
      where: {
        dealerId,
        paymentId: payment.id,
        type: PaymentAttemptType.initialization
      }
    });

    if (attemptCount >= env.PAYSTACK_MAX_RETRY_ATTEMPTS) {
      throw new AppError(429, "PAYMENT_RETRY_LIMIT_REACHED", "Payment retry limit has been reached.");
    }

    try {
      const response = await paystackClient.initialize({
        email: payment.customer.email,
        amountKobo: amountToKobo(payment.amount.toNumber()),
        reference: payment.providerReference,
        currency: payment.currency,
        metadata: jsonObject(payment.metadata)
      });

      await prisma.paymentAttempt.create({
        data: {
          dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.retry,
          status: PaymentAttemptStatus.successful,
          providerReference: payment.providerReference,
          attemptNumber: attemptCount + 1,
          responsePayload: response.data as unknown as Prisma.JsonObject
        }
      });

      return {
        paymentId: payment.id,
        reference: payment.providerReference,
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        publicKey: env.PAYSTACK_PUBLIC_KEY
      };
    } catch (error) {
      await prisma.paymentAttempt.create({
        data: {
          dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.retry,
          status: PaymentAttemptStatus.failed,
          providerReference: payment.providerReference,
          attemptNumber: attemptCount + 1,
          errorCode: error instanceof AppError ? error.code : "PAYSTACK_RETRY_ERROR",
          errorMessage: error instanceof Error ? error.message : "Payment retry failed.",
          nextRetryAt: nextRetryAt(attemptCount + 1)
        }
      });

      throw error;
    }
  },

  async handleWebhook(rawBody: Buffer, signature?: string) {
    if (!verifySignature(rawBody, signature)) {
      throw new AppError(401, "INVALID_PAYSTACK_SIGNATURE", "Paystack webhook signature is invalid.");
    }

    let payload: {
      event: string;
      data?: {
        id?: number;
        reference?: string;
        status?: string;
        amount?: number;
        currency?: string;
        paid_at?: string;
        gateway_response?: string;
        metadata?: unknown;
      };
    };

    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new AppError(400, "INVALID_WEBHOOK_JSON", "Paystack webhook body is not valid JSON.");
    }

    const reference = payload.data?.reference;
    const eventId = payload.data?.id ? String(payload.data.id) : `${payload.event}:${reference ?? crypto.randomUUID()}`;
    const payment = reference
      ? await prisma.payment.findFirst({
          where: {
            provider: PaymentProvider.paystack,
            providerReference: reference,
            deletedAt: null
          }
        })
      : null;

    const webhookEvent = await prisma.paymentWebhookEvent.upsert({
      where: {
        provider_providerEventId: {
          provider: PaymentProvider.paystack,
          providerEventId: eventId
        }
      },
      create: {
        dealerId: payment?.dealerId,
        paymentId: payment?.id,
        provider: PaymentProvider.paystack,
        event: payload.event,
        providerEventId: eventId,
        providerReference: reference,
        signature,
        payload: payload as unknown as Prisma.JsonObject,
        status: PaymentWebhookStatus.received
      },
      update: {}
    });

    if (webhookEvent.status === PaymentWebhookStatus.processed) {
      return { processed: false, reason: "duplicate" };
    }

    if (!payment) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: PaymentWebhookStatus.ignored,
          errorMessage: "No local payment matched webhook reference.",
          processedAt: new Date()
        }
      });

      return { processed: false, reason: "payment_not_found" };
    }

    const providerReference = reference ?? payment.providerReference;

    if (payload.event !== "charge.success" || payload.data?.status !== "success") {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: PaymentWebhookStatus.ignored,
          processedAt: new Date()
        }
      });

      return { processed: false, reason: "ignored_event" };
    }

    const paidAmount = payload.data.amount ? koboToAmount(payload.data.amount) : payment.amount.toNumber();
    if (Math.round(paidAmount * 100) !== Math.round(payment.amount.toNumber() * 100)) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: PaymentWebhookStatus.failed,
          errorMessage: "Webhook amount did not match local payment amount.",
          processedAt: new Date()
        }
      });

      throw new AppError(400, "PAYMENT_AMOUNT_MISMATCH", "Webhook amount did not match local payment amount.");
    }

    const verified = await paystackClient.verify(providerReference);
    if (verified.data.status !== "success") {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: PaymentWebhookStatus.failed,
          errorMessage: "Paystack transaction verification did not return success.",
          processedAt: new Date()
        }
      });

      throw new AppError(400, "PAYSTACK_TRANSACTION_NOT_SUCCESSFUL", "Paystack transaction is not successful.");
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.successful,
          providerTransaction: payload.data.id ? String(payload.data.id) : payment.providerTransaction,
          paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(),
          metadata: {
            ...jsonObject(payment.metadata),
            paystackGatewayResponse: payload.data.gateway_response
          }
        }
      }),
      prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date()
        }
      }),
      prisma.paymentAttempt.create({
        data: {
          dealerId: payment.dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.webhook_processing,
          status: PaymentAttemptStatus.successful,
          providerReference,
          responsePayload: payload as unknown as Prisma.JsonObject
        }
      })
    ]);

    try {
      await licenseDeliveryService.enqueueAndProcess(payment.id);
    } catch (error) {
      await prisma.paymentAttempt.create({
        data: {
          dealerId: payment.dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.webhook_processing,
          status: PaymentAttemptStatus.failed,
          providerReference,
          errorCode: "LICENSE_DELIVERY_FAILED",
          errorMessage: error instanceof Error ? error.message : "License delivery failed."
        }
      });
    }

    return { processed: true };
  }
};

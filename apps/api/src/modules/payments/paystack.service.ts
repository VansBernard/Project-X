import crypto from "node:crypto";
import {
  ContractStatus,
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
import { emailService } from "../licenses/delivery/email.service.js";
import { paystackClient } from "./paystack.client.js";
import type { CreateDeviceCheckoutInput, InitializePaymentInput, ValidatePaymentInput } from "./paystack.schemas.js";

export type PaymentLinkType = "temporary" | "permanent";

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

async function queuePayoutFailure(input: {
  dealerId: string;
  paymentId: string;
  recipient: string;
  amountSubunit: number;
  currency: string;
  paymentReference: string;
  error: unknown;
}) {
  const priorAttempts = await prisma.paymentAttempt.count({
    where: { paymentId: input.paymentId, type: PaymentAttemptType.retry }
  });
  const errorMessage = input.error instanceof Error ? input.error.message : "Dealer payout transfer failed.";
  const attempt = await prisma.paymentAttempt.create({
    data: {
      dealerId: input.dealerId, paymentId: input.paymentId, type: PaymentAttemptType.retry,
      status: PaymentAttemptStatus.failed, providerReference: input.paymentReference,
      attemptNumber: priorAttempts + 1,
      requestPayload: { kind: "dealer_payout", recipient: input.recipient, amountSubunit: input.amountSubunit, currency: input.currency },
      errorCode: "PAYSTACK_PAYOUT_FAILED", errorMessage, nextRetryAt: nextRetryAt(priorAttempts + 1)
    }
  });
  const dealer = await prisma.dealer.findUnique({ where: { id: input.dealerId }, select: { name: true, email: true } });
  if (dealer?.email) {
    const notification = await prisma.notification.create({
      data: {
        dealerId: input.dealerId, channel: "email", status: "queued", recipient: dealer.email,
        subject: "Dealer payout needs attention",
        body: `Payout for ${input.paymentReference} failed. Update payout details and retry it.`,
        metadata: { paymentId: input.paymentId, paymentReference: input.paymentReference, attemptId: attempt.id }
      }
    });
    try {
      await emailService.sendPayoutFailureEmail({ to: dealer.email, dealerName: dealer.name, amount: input.amountSubunit / 100, currency: input.currency, paymentReference: input.paymentReference });
      await prisma.notification.update({ where: { id: notification.id }, data: { status: "sent", sentAt: new Date() } });
    } catch (error) {
      console.error("[PAYOUT_ALERT_EMAIL_FAILED]", error);
    }
  }
  return attempt;
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

type SettledPayment = {
  id: string;
  contractId: string | null;
  contract: {
    id: string;
    remainingBalance: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
    status: ContractStatus;
  } | null;
  amount: Prisma.Decimal;
  providerTransaction: string | null;
  metadata: Prisma.JsonValue;
};

type PaystackChargeData = {
  id?: number;
  paid_at?: string;
  gateway_response?: string;
};

/**
 * Atomically claim settlement for a payment before changing any financial state.
 *
 * A Paystack event may be delivered again after a downstream action (such as
 * license email delivery) fails.  The payment status is the durable settlement
 * marker, so only the request that transitions it to `successful` may update a
 * contract balance or initiate a dealer payout.
 */
export async function settlePaymentOnce(
  tx: Pick<Prisma.TransactionClient, "payment" | "contract">,
  payment: SettledPayment,
  payloadData: PaystackChargeData
) {
  const paymentUpdate = await tx.payment.updateMany({
    where: {
      id: payment.id,
      deletedAt: null,
      status: { not: PaymentStatus.successful }
    },
    data: {
      status: PaymentStatus.successful,
      providerTransaction: payloadData.id ? String(payloadData.id) : payment.providerTransaction,
      paidAt: payloadData.paid_at ? new Date(payloadData.paid_at) : new Date(),
      metadata: {
        ...jsonObject(payment.metadata),
        paystackGatewayResponse: payloadData.gateway_response
      }
    }
  });

  if (paymentUpdate.count === 0) {
    return false;
  }

  if (payment.contractId && payment.contract) {
    const paymentAmount = payment.amount.toNumber();
    const currentRemaining = payment.contract.remainingBalance.toNumber();
    const currentPaid = payment.contract.amountPaid.toNumber();
    const nextRemaining = Math.max(0, currentRemaining - paymentAmount);
    const nextPaid = currentPaid + paymentAmount;

    await tx.contract.update({
      where: { id: payment.contract.id },
      data: {
        remainingBalance: nextRemaining,
        amountPaid: nextPaid,
        status: nextRemaining <= 0 ? ContractStatus.completed : payment.contract.status
      }
    });
  }

  return true;
}

export const paystackService = {
  async getPaymentLinkSummary(token: string, paymentType: PaymentLinkType = "temporary") {
    const links = await prisma.$queryRaw<Array<{
      serialNumber: string;
      contractNumber: string;
      customerName: string;
      customerEmail: string | null;
      currency: string;
      amount: Prisma.Decimal;
      remainingBalance: Prisma.Decimal;
    }>>(Prisma.sql`
      SELECT
        d."serial_number" AS "serialNumber",
        c."contract_number" AS "contractNumber",
        CONCAT_WS(' ', cu."first_name", cu."last_name") AS "customerName",
        cu."email" AS "customerEmail",
        c."currency" AS "currency",
        LEAST(c."installment_amount", c."remaining_balance") AS "amount",
        c."remaining_balance" AS "remainingBalance"
      FROM "device_payment_links" pl
      JOIN "devices" d ON d."id" = pl."device_id" AND d."deleted_at" IS NULL
      JOIN "contracts" c ON c."id" = pl."contract_id" AND c."deleted_at" IS NULL
      JOIN "customers" cu ON cu."id" = c."customer_id" AND cu."deleted_at" IS NULL
      WHERE pl."token_hash" = ${crypto.createHash("sha256").update(token).digest("hex")}
        AND pl."revoked_at" IS NULL
        AND c."status" = 'active'
        AND c."remaining_balance" > 0
      LIMIT 1
    `);

    const link = links[0];
    if (!link) {
      throw new AppError(404, "PAYMENT_LINK_NOT_FOUND", "This payment link is invalid, inactive, or has already been completed.");
    }

    const remainingBalance = link.remainingBalance.toNumber();
    const installmentAmount = link.amount.toNumber();
    const amount = paymentType === "permanent" ? remainingBalance : installmentAmount;

    return {
      serialNumber: link.serialNumber,
      contractNumber: link.contractNumber,
      customerName: link.customerName,
      customerEmail: link.customerEmail,
      currency: link.currency,
      amount,
      remainingBalance,
      paymentType
    };
  },

  async createCheckoutFromPaymentLink(token: string, paymentType: PaymentLinkType = "temporary") {
    const paymentLinks = await prisma.$queryRaw<Array<{ dealerId: string; deviceId: string; contractId: string }>>(Prisma.sql`
      SELECT "dealer_id" AS "dealerId", "device_id" AS "deviceId", "contract_id" AS "contractId"
      FROM "device_payment_links"
      WHERE "token_hash" = ${crypto.createHash("sha256").update(token).digest("hex")}
        AND "revoked_at" IS NULL
      LIMIT 1
    `);
    const paymentLink = paymentLinks[0];

    if (!paymentLink) {
      throw new AppError(404, "PAYMENT_LINK_NOT_FOUND", "This payment link is invalid or has been revoked.");
    }

    return this.createDeviceCheckout(paymentLink.dealerId, {
      deviceId: paymentLink.deviceId,
      contractId: paymentLink.contractId
    }, paymentType);
  },

  async createDeviceCheckout(
    dealerId: string,
    input: CreateDeviceCheckoutInput,
    paymentType: PaymentLinkType = "temporary"
  ) {
    const contract = await prisma.contract.findFirst({
      where: {
        id: input.contractId,
        dealerId,
        deviceId: input.deviceId,
        status: ContractStatus.active,
        deletedAt: null
      },
      select: {
        id: true,
        customerId: true,
        currency: true,
        installmentAmount: true,
        remainingBalance: true
      }
    });

    if (!contract) {
      throw new AppError(404, "ACTIVE_DEVICE_CONTRACT_NOT_FOUND", "No active contract was found for this device.");
    }

    const remainingBalance = contract.remainingBalance.toNumber();
    if (remainingBalance <= 0) {
      throw new AppError(409, "CONTRACT_ALREADY_PAID", "This contract has no outstanding balance.");
    }

    const amount = paymentType === "permanent"
      ? remainingBalance
      : Math.min(contract.installmentAmount.toNumber(), remainingBalance);
    return this.initializePayment(dealerId, {
      customerId: contract.customerId,
      contractId: contract.id,
      amount,
      currency: contract.currency,
      callbackUrl: input.callbackUrl,
      metadata: {
        source: "desktop-lock-screen",
        deviceId: input.deviceId,
        paymentPurpose: paymentType === "permanent" ? "permanent_unlock" : "scheduled_installment",
        licenseType: paymentType
      }
    });
  },

  async initializePayment(dealerId: string, input: InitializePaymentInput) {
    const [customer, contract, dealer] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: input.customerId, dealerId, deletedAt: null }
      }),
      input.contractId
        ? prisma.contract.findFirst({
            where: { id: input.contractId, dealerId, customerId: input.customerId, deletedAt: null }
          })
        : Promise.resolve(null),
      prisma.dealer.findFirst({ where: { id: dealerId, deletedAt: null } })
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
    if (!dealer) throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
    if (!dealer.paystackSubaccountCode && !dealer.paystackTransferRecipientCode) {
      throw new AppError(409, "DEALER_PAYOUT_NOT_CONFIGURED", "The dealer must configure a bank account or mobile money payout method before accepting payments.");
    }

    const reference = generateReference(dealerId);
    const metadata = {
      ...input.metadata,
      dealerId,
      customerId: input.customerId,
      contractId: input.contractId,
      payoutMethod: dealer.payoutMethod,
      transferRecipientCode: dealer.paystackTransferRecipientCode,
      platformCommissionPercent: env.PLATFORM_COMMISSION_PERCENT
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
        metadata,
        subaccount: dealer.paystackSubaccountCode ?? undefined,
        bearer: dealer.paystackSubaccountCode ? "subaccount" : undefined
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
    const [payment, dealer] = await Promise.all([
      prisma.payment.findFirst({
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
      }),
      prisma.dealer.findFirst({ where: { id: dealerId, deletedAt: null } })
    ]);

    if (!payment) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Pending payment was not found.");
    }
    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
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
        metadata: jsonObject(payment.metadata),
        subaccount: dealer.paystackSubaccountCode ?? undefined,
        bearer: dealer.paystackSubaccountCode ? "subaccount" : undefined
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
          },
          include: {
            contract: true
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

    const payloadData = payload.data ?? {};
    const settledNow = await prisma.$transaction((tx) => settlePaymentOnce(tx, payment, payloadData));

    const paymentMetadata = jsonObject(payment.metadata);
    const recipient = typeof paymentMetadata.transferRecipientCode === "string" ? paymentMetadata.transferRecipientCode : undefined;
    if (settledNow && recipient) {
      const commission = Number(paymentMetadata.platformCommissionPercent ?? env.PLATFORM_COMMISSION_PERCENT);
      const dealerAmount = Math.round(paidAmount * (1 - commission / 100) * 100);
      if (dealerAmount > 0) {
        try {
          const transfer = await paystackClient.initiateTransfer({
            amountSubunit: dealerAmount,
            recipient,
            reference: `px-payout-${payment.id.replace(/-/g, "").slice(0, 32)}`,
            currency: payment.currency,
            reason: `Project X dealer payout for ${providerReference}`
          });
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              metadata: {
                ...paymentMetadata,
                dealerPayoutAmount: dealerAmount / 100,
                dealerPayoutStatus: transfer.data.status,
                dealerPayoutTransferCode: transfer.data.transfer_code
              }
            }
          });
        } catch (error) {
          const failure = await queuePayoutFailure({
            dealerId: payment.dealerId,
            paymentId: payment.id,
            recipient,
            amountSubunit: dealerAmount,
            currency: payment.currency,
            paymentReference: providerReference,
            error
          });
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              metadata: {
                ...paymentMetadata,
                dealerPayoutAmount: dealerAmount / 100,
                dealerPayoutStatus: "failed",
                dealerPayoutError: failure.errorMessage,
                dealerPayoutNextRetryAt: failure.nextRetryAt?.toISOString()
              }
            }
          });
        }
      }
    }

    try {
      await licenseDeliveryService.enqueueAndProcess(payment.id);

      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date()
        }
      });

      await prisma.paymentAttempt.create({
        data: {
          dealerId: payment.dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.webhook_processing,
          status: PaymentAttemptStatus.successful,
          providerReference,
          responsePayload: payload as unknown as Prisma.JsonObject
        }
      });

      return { processed: true };
    } catch (error) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: PaymentWebhookStatus.failed,
          errorMessage: error instanceof Error ? error.message : "License delivery failed.",
          processedAt: new Date()
        }
      });

      await prisma.paymentAttempt.create({
        data: {
          dealerId: payment.dealerId,
          paymentId: payment.id,
          type: PaymentAttemptType.webhook_processing,
          status: PaymentAttemptStatus.failed,
          providerReference,
          errorCode: error instanceof AppError ? error.code : "LICENSE_DELIVERY_FAILED",
          errorMessage: error instanceof Error ? error.message : "License delivery failed."
        }
      });

      throw error;
    }
  },

  async retryDealerPayout(dealerId: string, paymentId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, dealerId, status: PaymentStatus.successful, deletedAt: null }
    });
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Successful payment was not found.");

    const metadata = jsonObject(payment.metadata);
    const recipient = typeof metadata.transferRecipientCode === "string" ? metadata.transferRecipientCode : undefined;
    const amount = Number(metadata.dealerPayoutAmount);
    if (!recipient || !Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, "PAYOUT_NOT_RETRYABLE", "This payment has no failed dealer payout to retry.");
    }

    const amountSubunit = Math.round(amount * 100);
    try {
      const transfer = await paystackClient.initiateTransfer({
        amountSubunit,
        recipient,
        reference: `px-payout-retry-${payment.id.replace(/-/g, "").slice(0, 24)}`,
        currency: payment.currency,
        reason: `Project X dealer payout retry for ${payment.providerReference}`
      });
      await prisma.$transaction([
        prisma.paymentAttempt.create({
          data: { dealerId, paymentId, type: PaymentAttemptType.retry, status: PaymentAttemptStatus.successful, providerReference: payment.providerReference, requestPayload: { kind: "dealer_payout", recipient, amountSubunit, currency: payment.currency }, responsePayload: transfer.data as unknown as Prisma.JsonObject }
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { metadata: { ...metadata, dealerPayoutStatus: transfer.data.status, dealerPayoutTransferCode: transfer.data.transfer_code, dealerPayoutError: null, dealerPayoutNextRetryAt: null } }
        })
      ]);
      return { transferCode: transfer.data.transfer_code, status: transfer.data.status };
    } catch (error) {
      const failure = await queuePayoutFailure({ dealerId, paymentId, recipient, amountSubunit, currency: payment.currency, paymentReference: payment.providerReference, error });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { metadata: { ...metadata, dealerPayoutStatus: "failed", dealerPayoutError: failure.errorMessage, dealerPayoutNextRetryAt: failure.nextRetryAt?.toISOString() } }
      });
      throw new AppError(502, "PAYOUT_RETRY_FAILED", "The payout could not be retried. The dealer has been alerted to update their payout details.");
    }
  }
};

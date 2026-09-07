import { ContractStatus, DealerStatus, DeviceStatus, PaymentStatus, Prisma, UserStatus, LicenseStatus } from "@prisma/client";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";
import { hashPassword } from "../../lib/crypto.js";
import { prisma } from "../../lib/prisma.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { authService, issueTokensForUser } from "../auth/auth.service.js";
import { assertDealerCurrency, contractManagementService } from "../contracts/contract-management.service.js";
import { calculatePaymentSchedule } from "../contracts/payment-calculation.service.js";
import { paystackClient } from "../payments/paystack.client.js";
import { licenseService } from "../licenses/license.service.js";
import { licenseSigningService } from "../licenses/signing.service.js";
import { emailService } from "../licenses/delivery/email.service.js";
import type {
  CreateContractInput,
  CompleteRegistrationInput,
  CreateCustomerInput,
  CreateDealerInput,
  DealerSignupInput,
  ListQueryInput,
  PayoutBanksQueryInput,
  RegisterDeviceInput,
  ResolvePayoutAccountInput,
  SuspendDealerInput,
  UpdatePayoutDetailsInput,
  UpdateDealerProfileInput,
  UpdateCustomerInput
} from "./dealer-management.schemas.js";

function generateLicenseKey(length = 20) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let index = 0; index < length; index++) key += alphabet[crypto.randomInt(0, alphabet.length)];
  return key;
}

function hashLicenseKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function metadataObject(value: unknown): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Prisma.JsonObject
    : {};
}

function payoutMetadata(value: unknown, fields: Record<string, string | undefined>): Prisma.JsonObject {
  const metadata = { ...metadataObject(value) } as Record<string, Prisma.JsonValue>;
  delete metadata.settlementAccountNumber;
  delete metadata.mobileMoneyNumber;
  const { settlementAccountNumber, mobileMoneyNumber, ...safeFields } = fields;
  const number = settlementAccountNumber ?? mobileMoneyNumber;
  const maskedNumber = number ? `${"*".repeat(Math.max(0, number.length - 4))}${number.slice(-4)}` : undefined;
  const definedFields = Object.fromEntries(Object.entries(safeFields).filter(([, entry]) => entry !== undefined));
  return {
    ...metadata,
    ...definedFields,
    ...(maskedNumber ? { payoutNumberMasked: maskedNumber } : {})
  } as Prisma.JsonObject;
}

function createPaymentLinkToken(deviceId: string, contractId: string) {
  return crypto
    .createHmac("sha256", env.PAYMENT_LINK_SECRET)
    .update(`${deviceId}:${contractId}`)
    .digest("base64url");
}

function hashPaymentLinkToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function paymentUrl(token: string) {
  return `${env.PAYMENT_PORTAL_BASE_URL.replace(/\/$/, "")}/r/${token}`;
}

async function savePaymentLink(dealerId: string, deviceId: string, contractId: string, token: string) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "device_payment_links" ("dealer_id", "device_id", "contract_id", "token_hash", "updated_at")
    VALUES (${dealerId}::uuid, ${deviceId}::uuid, ${contractId}::uuid, ${hashPaymentLinkToken(token)}, NOW())
    ON CONFLICT ("device_id", "contract_id")
    DO UPDATE SET "token_hash" = EXCLUDED."token_hash", "revoked_at" = NULL, "updated_at" = NOW()
  `);
}

function validityDays(plan: "weekly" | "monthly" | "yearly") {
  return plan === "weekly" ? 7 : plan === "yearly" ? 365 : 30;
}

function pagination(query: ListQueryInput) {
  return {
    take: query.take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
  };
}

function pageResult<T extends { id: string }>(items: T[], take: number) {
  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, take) : items;
  return {
    data,
    nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null
  };
}

async function ensureActiveDealer(dealerId: string) {
  const dealer = await prisma.dealer.findFirst({
    where: {
      id: dealerId,
      status: DealerStatus.active,
      deletedAt: null
    }
  });

  if (!dealer) {
    throw new AppError(403, "DEALER_INACTIVE", "Dealer is not active.");
  }

  return dealer;
}

const permissionLabels: Record<string, { name: string; description: string }> = {
  [Permissions.AuthLogin]: { name: "Login", description: "Authenticate into Project X" },
  [Permissions.AuthRefresh]: { name: "Refresh Session", description: "Refresh access tokens" },
  [Permissions.AuthLogout]: { name: "Logout", description: "Revoke own session" },
  [Permissions.UsersRead]: { name: "Read Users", description: "Read users within a dealer" },
  [Permissions.UsersManage]: { name: "Manage Users", description: "Create and manage dealer users" },
  [Permissions.RolesManage]: { name: "Manage Roles", description: "Create and manage roles and permissions" },
  [Permissions.CustomersCreate]: { name: "Create Customers", description: "Create customer profiles" },
  [Permissions.CustomersRead]: { name: "Read Customers", description: "Read customer profiles" },
  [Permissions.CustomersManage]: { name: "Manage Customers", description: "Update customer profiles" },
  [Permissions.CustomersHistoryRead]: { name: "Read Customer History", description: "Read customer history" },
  [Permissions.DevicesRegister]: { name: "Register Devices", description: "Register customer devices" },
  [Permissions.ContractsCreate]: { name: "Create Contracts", description: "Create customer contracts" },
  [Permissions.ContractsRead]: { name: "Read Contracts", description: "Read customer contracts" },
  [Permissions.ContractsManage]: { name: "Manage Contracts", description: "Manage customer contracts" },
  [Permissions.ContractsStatus]: { name: "Update Contract Status", description: "Update contract status" },
  [Permissions.PaymentsRead]: { name: "Read Payments", description: "Read payment records" },
  [Permissions.PaymentsInitialize]: { name: "Initialize Payments", description: "Initialize payment collection" },
  [Permissions.PaymentsValidate]: { name: "Validate Payments", description: "Validate payment references" },
  [Permissions.LicensesIssue]: { name: "Issue Licenses", description: "Issue device licenses" },
  [Permissions.LicensesRead]: { name: "Read Licenses", description: "Read device licenses" },
  [Permissions.LicensesVerify]: { name: "Verify Licenses", description: "Verify device licenses" },
  [Permissions.LicensesDeliver]: { name: "Deliver Licenses", description: "Send license delivery emails" },
  [Permissions.LicensesDeliveryRetry]: { name: "Retry License Delivery", description: "Retry license delivery jobs" },
  [Permissions.ReportsRead]: { name: "Read Reports", description: "Read reports and analytics" }
};

const rolePermissionMap = {
  [Roles.Dealer]: [
    Permissions.AuthLogin,
    Permissions.AuthRefresh,
    Permissions.AuthLogout,
    Permissions.UsersRead,
    Permissions.UsersManage,
    Permissions.RolesManage,
    Permissions.CustomersCreate,
    Permissions.CustomersRead,
    Permissions.CustomersManage,
    Permissions.CustomersHistoryRead,
    Permissions.DevicesRegister,
    Permissions.ContractsCreate,
    Permissions.ContractsRead,
    Permissions.ContractsManage,
    Permissions.ContractsStatus,
    Permissions.PaymentsRead,
    Permissions.PaymentsInitialize,
    Permissions.PaymentsValidate,
    Permissions.LicensesIssue,
    Permissions.LicensesRead,
    Permissions.LicensesVerify,
    Permissions.LicensesDeliver,
    Permissions.LicensesDeliveryRetry,
    Permissions.ReportsRead
  ],
  [Roles.SalesAgent]: [
    Permissions.AuthLogin,
    Permissions.AuthRefresh,
    Permissions.AuthLogout,
    Permissions.CustomersCreate,
    Permissions.CustomersRead,
    Permissions.CustomersManage,
    Permissions.CustomersHistoryRead,
    Permissions.DevicesRegister,
    Permissions.ContractsRead,
    Permissions.PaymentsRead,
    Permissions.LicensesRead,
    Permissions.ReportsRead
  ],
  [Roles.Customer]: [
    Permissions.AuthLogin,
    Permissions.AuthRefresh,
    Permissions.AuthLogout
  ]
};

type TransactionClient = Prisma.TransactionClient;

async function provisionDealerAccess(tx: TransactionClient, dealerId: string) {
  const permissions = new Map<string, { id: string }>();

  for (const key of Object.values(Permissions)) {
    if (key === Permissions.PlatformManage || key.startsWith("dealers:")) {
      continue;
    }

    const label = permissionLabels[key];
    const permission = await tx.permission.upsert({
      where: {
        dealerId_key: {
          dealerId,
          key
        }
      },
      update: {
        name: label.name,
        description: label.description,
        deletedAt: null
      },
      create: {
        dealerId,
        key,
        name: label.name,
        description: label.description
      }
    });

    permissions.set(key, permission);
  }

  const roles = {
    [Roles.Dealer]: await tx.role.upsert({
      where: { dealerId_name: { dealerId, name: Roles.Dealer } },
      update: { description: "Dealer owner or administrator role", isSystem: true, deletedAt: null },
      create: {
        dealerId,
        name: Roles.Dealer,
        description: "Dealer owner or administrator role",
        isSystem: true
      }
    }),
    [Roles.SalesAgent]: await tx.role.upsert({
      where: { dealerId_name: { dealerId, name: Roles.SalesAgent } },
      update: { description: "Dealer sales and onboarding role", isSystem: true, deletedAt: null },
      create: {
        dealerId,
        name: Roles.SalesAgent,
        description: "Dealer sales and onboarding role",
        isSystem: true
      }
    }),
    [Roles.Customer]: await tx.role.upsert({
      where: { dealerId_name: { dealerId, name: Roles.Customer } },
      update: { description: "Customer self-service role", isSystem: true, deletedAt: null },
      create: {
        dealerId,
        name: Roles.Customer,
        description: "Customer self-service role",
        isSystem: true
      }
    })
  };

  for (const [roleName, rolePermissions] of Object.entries(rolePermissionMap)) {
    const role = roles[roleName as keyof typeof roles];

    for (const key of rolePermissions) {
      const permission = permissions.get(key);
      if (!permission) {
        continue;
      }

      await tx.rolePermission.upsert({
        where: {
          dealerId_roleId_permissionId: {
            dealerId,
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          dealerId,
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  return roles;
}

export function hasDealerSettlementInfo(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  const meta = metadata as Record<string, unknown>;
  const payoutMethod = meta.payoutMethod as string | undefined;

  if (payoutMethod === "bank") {
    return Boolean(meta.settlementBank && meta.settlementAccountNumber);
  }

  if (payoutMethod === "mobile_money") {
    return Boolean(meta.mobileMoneyProvider && meta.mobileMoneyNumber);
  }

  return false;
}

export const dealerManagementService = {
  async resolvePayoutAccount(input: ResolvePayoutAccountInput) {
    const result = await paystackClient.resolveAccount({
      accountNumber: input.accountNumber,
      bankCode: input.bankCode
    });
    return { accountName: result.data.account_name, accountNumber: result.data.account_number };
  },

  async payoutBanks(input: PayoutBanksQueryInput) {
    const countryNames: Record<PayoutBanksQueryInput["country"], "ghana" | "kenya" | "nigeria" | "south africa"> = {
      GH: "ghana", KE: "kenya", NG: "nigeria", ZA: "south africa"
    };
    const result = await paystackClient.listBanks(countryNames[input.country]);
    return result.data
      .filter((bank) => bank.active !== false)
      .map((bank) => ({ name: bank.name, code: bank.code }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },

  async signup(input: DealerSignupInput) {
    const existingDealer = await prisma.dealer.findFirst({
      where: { OR: [{ slug: input.dealer.slug }, { email: input.owner.email }], deletedAt: null }
    });
    if (existingDealer) throw new AppError(409, "DEALER_ALREADY_EXISTS", "A dealer with this workspace or email already exists.");
    const token = crypto.randomBytes(32).toString("base64url");
    const passwordHash = await hashPassword(input.owner.password);
    const expiresAt = new Date(Date.now() + env.AUTH_TOKEN_TTL_MINUTES * 60 * 1000);
    await prisma.pendingDealerSignup.upsert({
      where: { email: input.owner.email },
      update: { slug: input.dealer.slug, payload: { input, passwordHash } as Prisma.JsonObject, tokenHash: hashLicenseKey(token), expiresAt, confirmedAt: null },
      create: { email: input.owner.email, slug: input.dealer.slug, payload: { input, passwordHash } as Prisma.JsonObject, tokenHash: hashLicenseKey(token), expiresAt }
    });
    await emailService.sendDealerRegistrationEmail({
      to: input.owner.email,
      dealerName: input.dealer.name,
      dealerSlug: input.dealer.slug,
      verificationUrl: `${env.WEB_ORIGIN[0]}/verify-email?signupToken=${encodeURIComponent(token)}`
    });
    return { pending: true, verificationEmailSent: true };
  },

  async confirmSignup(token: string) {
    const pending = await prisma.pendingDealerSignup.findFirst({
      where: { tokenHash: hashLicenseKey(token), confirmedAt: null, expiresAt: { gt: new Date() } }
    });
    if (!pending) throw new AppError(400, "INVALID_SIGNUP_TOKEN", "This registration confirmation link is invalid or has expired.");
    const payload = pending.payload as { input: DealerSignupInput; passwordHash: string };
    const result = await this.createConfirmedSignup(payload.input, payload.passwordHash, true);
    await prisma.pendingDealerSignup.delete({ where: { id: pending.id } });
    
    // Generate auth tokens for auto-login
    try {
      const userWithRole = await prisma.user.findFirst({
        where: { 
          id: result.owner.id,
          dealerId: result.dealer.id
        },
        include: { role: true }
      });
      
      if (userWithRole && userWithRole.role) {
        const tokens = await issueTokensForUser(userWithRole as any);
        return {
          ...result,
          auth: tokens
        };
      }
    } catch (error) {
      // Log error but don't fail the signup - tokens generation is a nice-to-have
      console.error("[TOKEN_GENERATION_FAILED]", { userId: result.owner.id, error });
    }
    
    return result;
  },

  async createConfirmedSignup(input: DealerSignupInput, passwordHash: string, emailConfirmed = false) {
    const existingDealer = await prisma.dealer.findFirst({
      where: {
        OR: [
          { slug: input.dealer.slug },
          ...(input.dealer.email ? [{ email: input.dealer.email }] : [])
        ],
        deletedAt: null
      }
    });

    if (existingDealer) {
      throw new AppError(409, "DEALER_ALREADY_EXISTS", "A dealer with this slug or email already exists.");
    }

    let createdRecipientCode: string | undefined;
    const signup = await prisma.$transaction(async (tx) => {
      let dealer = await tx.dealer.create({
        data: {
          name: input.dealer.name,
          legalName: input.dealer.legalName,
          slug: input.dealer.slug,
          email: input.dealer.email ?? input.owner.email,
          phone: input.dealer.phone ?? input.owner.phone,
          country: input.dealer.country,
          timezone: input.dealer.timezone,
          metadata: input.dealer.metadata as Prisma.JsonObject
        }
      });

      const payoutMethod = typeof input.dealer.metadata?.payoutMethod === "string"
        ? input.dealer.metadata.payoutMethod
        : undefined;
      const settlementBank = typeof input.dealer.metadata?.settlementBank === "string"
        ? input.dealer.metadata.settlementBank
        : undefined;
      const settlementAccountNumber = typeof input.dealer.metadata?.settlementAccountNumber === "string"
        ? input.dealer.metadata.settlementAccountNumber
        : undefined;
      const mobileMoneyProvider = typeof input.dealer.metadata?.mobileMoneyProvider === "string"
        ? input.dealer.metadata.mobileMoneyProvider
        : undefined;
      const mobileMoneyNumber = typeof input.dealer.metadata?.mobileMoneyNumber === "string"
        ? input.dealer.metadata.mobileMoneyNumber
        : undefined;
      const payoutCurrency = typeof input.dealer.metadata?.currency === "string"
        ? input.dealer.metadata.currency
        : "NGN";
      const suppliedAccountHolderName = typeof input.dealer.metadata?.accountHolderName === "string"
        ? input.dealer.metadata.accountHolderName.trim()
        : undefined;

      let paystackTransferRecipient: { recipient_code: string; active: boolean } | null = null;
      const recipientName = `${input.owner.firstName ?? ""} ${input.owner.lastName ?? ""}`.trim() || input.dealer.name;
      const bankRecipientTypeByCountry: Record<string, "nuban" | "ghipss" | "kepss" | "basa"> = {
        NG: "nuban",
        GH: "ghipss",
        KE: "kepss",
        ZA: "basa"
      };
      const normalizedMobileMoneyProvider = (() => {
        if (!mobileMoneyProvider) return undefined;
        const providerKey = mobileMoneyProvider.trim().toUpperCase().replace(/[-\s]+/g, "");
        const providerCodes: Record<string, string> = {
          MTN: "MTN",
          AIRTELTIGO: "ATL",
          AIRTEL: "ATL",
          TIGO: "ATL",
          TELECEL: "VOD",
          VODAFONE: "VOD",
          VOD: "VOD",
          MPESA: "MPESA"
        };

        return providerCodes[providerKey] ?? providerKey;
      })();

      const hasSettlementInfo = hasDealerSettlementInfo(input.dealer.metadata ?? {});
      const hasMobileMoneyInfo = payoutMethod === "mobile_money" && normalizedMobileMoneyProvider && mobileMoneyNumber;
      const hasBankInfo = Boolean(settlementBank && settlementAccountNumber);

      const bankRecipientType = input.dealer.country ? bankRecipientTypeByCountry[input.dealer.country] : undefined;

      if (hasSettlementInfo && hasBankInfo && (input.dealer.country === "NG" || input.dealer.country === "GH")) {
        const resolved = await paystackClient.resolveAccount({
          accountNumber: settlementAccountNumber!,
          bankCode: settlementBank!
        });
        const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!suppliedAccountHolderName || normalized(suppliedAccountHolderName) !== normalized(resolved.data.account_name)) {
          throw new AppError(
            400,
            "ACCOUNT_OWNER_CONFIRMATION_REQUIRED",
            `Paystack resolved this account to ${resolved.data.account_name}. Enter that exact account-holder name to confirm it before creating the dealer.`
          );
        }
      }

      // Dealers can complete payout setup after signup if they do not yet have settlement details.
      try {
        if (hasSettlementInfo) {
          if (hasMobileMoneyInfo) {
            paystackTransferRecipient = (await paystackClient.createTransferRecipient({
              type: "mobile_money",
              name: recipientName,
              accountNumber: mobileMoneyNumber!,
              bankCode: normalizedMobileMoneyProvider!,
              currency: payoutCurrency
            })).data;
          } else if (hasBankInfo && bankRecipientType) {
            paystackTransferRecipient = (await paystackClient.createTransferRecipient({
              type: bankRecipientType,
              name: recipientName,
              accountNumber: settlementAccountNumber!,
              bankCode: settlementBank!,
              currency: payoutCurrency
            })).data;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[PAYSTACK_RECIPIENT_CREATION_FAILED] Dealer signup blocked:", {
          dealerSlug: input.dealer.slug,
          dealerName: input.dealer.name,
          error: errorMessage,
          payoutMethod,
          timestamp: new Date().toISOString()
        });
        throw new AppError(
          502,
          "PAYSTACK_RECIPIENT_CREATION_FAILED",
          `Failed to configure the Paystack payout recipient: ${errorMessage}. Please verify your settlement information and try again.`
        );
      }

      if (hasSettlementInfo && !paystackTransferRecipient) {
        throw new AppError(
          400,
          "UNSUPPORTED_PAYOUT_COUNTRY",
          "Automatic payouts are currently supported in Nigeria, Ghana, Kenya, and South Africa."
        );
      }

      if (paystackTransferRecipient) {
        createdRecipientCode = paystackTransferRecipient.recipient_code;
      }

      dealer = await tx.dealer.update({
        where: { id: dealer.id },
        data: hasSettlementInfo ? {
          payoutMethod: payoutMethod ?? "bank",
          paystackSubaccountCode: null,
          paystackSubaccountId: null,
          paystackSubaccountStatus: null,
          paystackSubaccountUpdatedAt: null,
          paystackTransferRecipientCode: paystackTransferRecipient?.recipient_code ?? null,
          paystackTransferRecipientStatus: paystackTransferRecipient?.active ? "active" : "inactive",
          paystackTransferRecipientUpdatedAt: new Date(),
          metadata: payoutMetadata(input.dealer.metadata, {
            payoutMethod: payoutMethod ?? "bank",
            currency: payoutCurrency,
            settlementBank,
            mobileMoneyProvider: normalizedMobileMoneyProvider,
            accountHolderName: suppliedAccountHolderName
          })
        } : {
          paystackSubaccountCode: null,
          paystackSubaccountId: null,
          paystackSubaccountStatus: null,
          paystackSubaccountUpdatedAt: null,
          metadata: input.dealer.metadata as Prisma.JsonObject
        }
      });

      const roles = await provisionDealerAccess(tx, dealer.id);
      const owner = await tx.user.create({
        data: {
          dealerId: dealer.id,
          roleId: roles[Roles.Dealer].id,
          email: input.owner.email,
          passwordHash,
          firstName: input.owner.firstName,
          lastName: input.owner.lastName,
          phone: input.owner.phone,
          status: UserStatus.active,
          emailVerifiedAt: emailConfirmed ? new Date() : null,
          passwordChangedAt: new Date(),
          metadata: {
            source: "dealer_signup",
            isOwner: true
          }
        }
      });

      return {
        dealer,
        owner: {
          id: owner.id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
          roleName: Roles.Dealer
        },
        login: {
          dealerSlug: dealer.slug,
          email: owner.email
        }
      };
    }, {
      maxWait: 10_000,
      timeout: 60_000
    }).catch(async (error) => {
      if (createdRecipientCode) {
        try {
          await paystackClient.deactivateTransferRecipient(createdRecipientCode);
        } catch (cleanupError) {
          console.error("[PAYSTACK_RECIPIENT_CLEANUP_FAILED]", { createdRecipientCode, cleanupError });
        }
      }
      throw error;
    });

    // Email delivery must not undo a successfully created dealer account.
    return { ...signup, verificationEmailSent: emailConfirmed };
  },

  async updatePayoutDetails(dealerId: string, input: UpdatePayoutDetailsInput) {
    const dealer = await prisma.dealer.findFirst({ where: { id: dealerId, deletedAt: null } });
    if (!dealer?.country) throw new AppError(400, "PAYOUT_COUNTRY_REQUIRED", "Set the dealer country before updating payout details.");

    const bankTypes: Record<string, "nuban" | "ghipss" | "kepss" | "basa"> = { NG: "nuban", GH: "ghipss", KE: "kepss", ZA: "basa" };
    const providerCodes: Record<string, string> = { MTN: "MTN", AIRTELTIGO: "ATL", AIRTEL: "ATL", TIGO: "ATL", TELECEL: "VOD", VODAFONE: "VOD", VOD: "VOD", MPESA: "MPESA" };
    const recipientName = dealer.name;

    if (input.payoutMethod === "bank") {
      const type = bankTypes[dealer.country];
      if (!type) throw new AppError(400, "UNSUPPORTED_PAYOUT_COUNTRY", "Automatic bank payouts are not supported for this country.");
      if (dealer.country === "NG" || dealer.country === "GH") {
        const resolved = await paystackClient.resolveAccount({ accountNumber: input.accountNumber, bankCode: input.bankCode! });
        const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!input.accountHolderName || normalize(input.accountHolderName) !== normalize(resolved.data.account_name)) {
          throw new AppError(400, "ACCOUNT_OWNER_CONFIRMATION_REQUIRED", `Paystack resolved this account to ${resolved.data.account_name}. Enter that exact account-holder name to confirm it.`);
        }
      }
      const recipient = await paystackClient.createTransferRecipient({ type, name: recipientName, accountNumber: input.accountNumber, bankCode: input.bankCode, currency: input.currency });
      return prisma.dealer.update({ where: { id: dealerId }, data: { payoutMethod: "bank", paystackTransferRecipientCode: recipient.data.recipient_code, paystackTransferRecipientStatus: recipient.data.active ? "active" : "inactive", paystackTransferRecipientUpdatedAt: new Date(), metadata: payoutMetadata(dealer.metadata, { payoutMethod: "bank", settlementBank: input.bankCode, accountHolderName: input.accountHolderName, currency: input.currency, settlementAccountNumber: input.accountNumber }) } });
    }

    if (dealer.country !== "GH" && dealer.country !== "KE") throw new AppError(400, "UNSUPPORTED_MOBILE_MONEY_COUNTRY", "Mobile-money payouts are supported only in Ghana and Kenya.");
    const providerKey = input.mobileMoneyProvider!.trim().toUpperCase().replace(/[-\s]+/g, "");
    const recipient = await paystackClient.createTransferRecipient({ type: "mobile_money", name: recipientName, accountNumber: input.accountNumber, bankCode: providerCodes[providerKey] ?? providerKey, currency: input.currency });
    return prisma.dealer.update({ where: { id: dealerId }, data: { payoutMethod: "mobile_money", paystackTransferRecipientCode: recipient.data.recipient_code, paystackTransferRecipientStatus: recipient.data.active ? "active" : "inactive", paystackTransferRecipientUpdatedAt: new Date(), metadata: payoutMetadata(dealer.metadata, { payoutMethod: "mobile_money", mobileMoneyProvider: providerCodes[providerKey] ?? providerKey, mobileMoneyNumber: input.accountNumber, currency: input.currency }) } });
  },

  async createDealer(input: CreateDealerInput) {
    return prisma.$transaction(async (tx) => {
      const dealer = await tx.dealer.create({
        data: {
          name: input.name,
          legalName: input.legalName,
          slug: input.slug,
          email: input.email,
          phone: input.phone,
          country: input.country,
          timezone: input.timezone,
          metadata: input.metadata as Prisma.JsonObject
        }
      });

      await provisionDealerAccess(tx, dealer.id);

      return dealer;
    });
  },

  async suspendDealer(dealerId: string, input: SuspendDealerInput) {
    const dealer = await prisma.dealer.findFirst({
      where: { id: dealerId, deletedAt: null }
    });

    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
    }

    return prisma.dealer.update({
      where: { id: dealerId },
      data: {
        status: DealerStatus.suspended,
        suspendedAt: new Date(),
        suspendedReason: input.reason
      }
    });
  },

  async deleteDealer(dealerId: string) {
    const dealer = await prisma.dealer.findFirst({
      where: { id: dealerId, deletedAt: null }
    });

    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
    }

    return prisma.dealer.update({
      where: { id: dealerId },
      data: {
        status: DealerStatus.deleted,
        deletedAt: new Date()
      }
    });
  },

  async listDealers(query: ListQueryInput) {
    const dealers = await prisma.dealer.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status as never } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { devices: true }
        }
      },
      ...pagination(query)
    });

    const dealerIds = dealers.map((dealer) => dealer.id);
    const paymentTotals = await prisma.payment.groupBy({
      by: ['dealerId'],
      where: {
        dealerId: { in: dealerIds },
        status: PaymentStatus.successful,
        deletedAt: null
      },
      _sum: { amount: true }
    });

    const revenueByDealer = new Map(paymentTotals.map((row) => [row.dealerId, row._sum.amount ?? 0]));

    return pageResult(
      dealers.map((dealer) => {
        const { _count, ...dealerData } = dealer;
        return {
          ...dealerData,
          deviceCount: _count.devices,
          totalRevenue: Number(revenueByDealer.get(dealer.id) ?? 0)
        };
      }),
      query.take
    );
  },

  async dealerStatistics(dealerId: string) {
    const dealer = await prisma.dealer.findFirst({
      where: { id: dealerId, deletedAt: null }
    });

    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
    }

    const [
      customers,
      devices,
      activeContracts,
      completedContracts,
      successfulPayments,
      paymentTotals
    ] = await Promise.all([
      prisma.customer.count({ where: { dealerId, deletedAt: null } }),
      prisma.device.count({ where: { dealerId, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, status: ContractStatus.active, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, status: ContractStatus.completed, deletedAt: null } }),
      prisma.payment.count({ where: { dealerId, status: PaymentStatus.successful, deletedAt: null } }),
      prisma.payment.aggregate({
        where: { dealerId, status: PaymentStatus.successful, deletedAt: null },
        _sum: { amount: true }
      })
    ]);

    return {
      dealer,
      totals: {
        customers,
        devices,
        activeContracts,
        completedContracts,
        successfulPayments,
        successfulPaymentAmount: paymentTotals._sum.amount ?? 0
      }
    };
  },

  async createCustomer(dealerId: string, input: CreateCustomerInput) {
    await ensureActiveDealer(dealerId);

    return prisma.customer.create({
      data: {
        dealerId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        metadata: input.metadata as Prisma.JsonObject
      }
    });
  },

  async listCustomers(dealerId: string, query: ListQueryInput) {
    await ensureActiveDealer(dealerId);

    const customers = await prisma.customer.findMany({
      where: {
        dealerId,
        deletedAt: null,
        ...(query.status ? { status: query.status as never } : {})
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });

    return pageResult(customers, query.take);
  },

  async updateCustomer(dealerId: string, customerId: string, input: UpdateCustomerInput) {
    await ensureActiveDealer(dealerId);

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, dealerId, deletedAt: null }
    });

    if (!customer) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer was not found.");
    }

    return prisma.customer.update({
      where: { id: customerId },
      data: {
        ...input,
        metadata: input.metadata as Prisma.JsonObject | undefined
      }
    });
  },

  async registerDevice(dealerId: string, input: RegisterDeviceInput) {
    await ensureActiveDealer(dealerId);

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, dealerId, deletedAt: null }
      });

      if (!customer) {
        throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer was not found.");
      }
    }

    try {
      const device = await prisma.$transaction(async (tx) => {
        const created = await tx.device.create({
          data: {
            dealerId,
            customerId: input.customerId,
            serialNumber: input.serialNumber,
            manufacturer: input.manufacturer,
            model: input.model,
            hardwareFingerprint: input.hardwareFingerprint,
            status: input.customerId ? DeviceStatus.assigned : DeviceStatus.inventory,
            metadata: input.metadata as Prisma.JsonObject
          }
        });

        return created;
      }, {
        maxWait: 10_000,
        timeout: 60_000
      });

      return device;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(
          409,
          "DEVICE_ALREADY_EXISTS",
          "A device with this serial number already exists for this dealer."
        );
      }

      throw error;
    }
  },

  async listDevices(dealerId: string, query: ListQueryInput) {
    await ensureActiveDealer(dealerId);

    const devices = await prisma.device.findMany({
      where: {
        dealerId,
        deletedAt: null,
        ...(query.status ? { status: query.status as DeviceStatus } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true, firstName: true, lastName: true } },
        contracts: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { contractNumber: true, currency: true, remainingBalance: true }
        }
      },
      ...pagination(query)
    });

    return pageResult(
      devices.map(({ contracts, ...device }) => {
        return {
          ...device,
          contract: contracts[0] ?? null,
          license: null
        };
      }),
      query.take
    );
  },

  async completeRegistration(dealerId: string, input: CompleteRegistrationInput) {
    await ensureActiveDealer(dealerId);
    await assertDealerCurrency(dealerId, input.contract.currency);

    if (!input.device.hardwareFingerprint) {
      throw new AppError(400, "DEVICE_FINGERPRINT_REQUIRED", "A device hardware fingerprint is required for registration.");
    }

    const existing = await prisma.contract.findFirst({
      where: { dealerId, contractNumber: input.contract.contractNumber, deletedAt: null },
      include: { customer: true, device: true, licenses: { orderBy: { createdAt: "asc" } } }
    });
    if (existing) {
      const paymentLinkToken = createPaymentLinkToken(existing.deviceId!, existing.id);
      await savePaymentLink(dealerId, existing.deviceId!, existing.id, paymentLinkToken);

      return {
        customer: existing.customer,
        device: existing.device,
        contract: existing,
        vouchers: existing.licenses.filter((license) => license.licenseType === "temporary"),
        permanentLicense: existing.licenses.find((license) => license.licenseType === "permanent") ?? null,
        paymentUrl: paymentUrl(paymentLinkToken),
        idempotent: true
      };
    }

    const remainingBalance = input.contract.devicePrice - input.contract.deposit;
    if (remainingBalance <= 0 || input.contract.deposit > input.contract.devicePrice) {
      throw new AppError(400, "INVALID_CONTRACT_AMOUNTS", "Deposit must be less than or equal to the device price.");
    }
    const schedule = calculatePaymentSchedule({
      ...input.contract,
      customerId: "00000000-0000-0000-0000-000000000000",
      deviceId: undefined
    });
    const now = new Date();

    try {
      return await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: { ...input.customer, dealerId, metadata: input.customer.metadata as Prisma.JsonObject }
        });
        const device = await tx.device.create({
          data: {
            ...input.device,
            dealerId,
            customerId: customer.id,
            status: DeviceStatus.assigned,
            metadata: input.device.metadata as Prisma.JsonObject
          }
        });
        const contract = await tx.contract.create({
          data: {
            dealerId, customerId: customer.id, deviceId: device.id,
            contractNumber: input.contract.contractNumber, status: ContractStatus.active,
            currency: input.contract.currency, devicePrice: input.contract.devicePrice,
            depositAmount: input.contract.deposit, remainingBalance,
            installmentAmount: schedule.baseInstallmentAmount, principalAmount: input.contract.devicePrice,
            totalAmount: schedule.totalAmount, amountPaid: input.contract.deposit,
            firstDueDate: input.contract.firstDueDate, nextDueDate: input.contract.firstDueDate,
            startDate: now, endDate: schedule.installments[schedule.installments.length - 1].dueDate,
            metadata: { ...input.contract.metadata, paymentPlan: input.contract.paymentPlan, source: "desktop-registration" } as Prisma.JsonObject
          }
        });

        // Create installments separately after contract is created
        await tx.contractInstallment.createMany({
          data: schedule.installments.map((installment) => ({
            dealerId,
            contractId: contract.id,
            sequenceNumber: installment.sequenceNumber,
            dueDate: installment.dueDate,
            amountDue: installment.amountDue
          }))
        });

        const makeLicense = async (licenseType: "temporary" | "permanent", expiresAt: Date | undefined, sequenceNumber?: number) => {
          const key = generateLicenseKey();
          const license = await tx.license.create({
            data: { dealerId, customerId: customer.id, deviceId: device.id, contractId: contract.id, licenseKey: key, keyId: env.LICENSE_KEY_ID, signedPayload: {}, signature: "", signatureAlgorithm: "RSA-SHA256", status: LicenseStatus.pending, issuedAt: now, expiresAt, licenseType, metadata: { source: licenseType === "temporary" ? "desktop-registration-voucher" : "desktop-registration-permanent", sequenceNumber } as Prisma.JsonObject }
          });
          const payload = { licenseId: license.id, deviceId: device.id, contractId: contract.id, issuedAt: now.toISOString(), expiresAt: expiresAt?.toISOString(), licenseType, keyId: env.LICENSE_KEY_ID, algorithm: "RSA-SHA256" as const, hardwareFingerprint: input.device.hardwareFingerprint, licenseKeyHash: hashLicenseKey(key) };
          const signature = licenseSigningService.sign(payload);
          const saved = await tx.license.update({ where: { id: license.id }, data: { signedPayload: payload as Prisma.JsonObject, signature } });
          return { ...saved, licenseKey: undefined };
        };

        const vouchers = await Promise.all(schedule.installments.map((installment) => makeLicense("temporary", new Date(installment.dueDate.getTime() + validityDays(input.contract.paymentPlan) * 86_400_000), installment.sequenceNumber)));
        const permanentLicense = await makeLicense("permanent", undefined);
        const paymentLinkToken = createPaymentLinkToken(device.id, contract.id);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "device_payment_links" ("dealer_id", "device_id", "contract_id", "token_hash", "updated_at")
          VALUES (${dealerId}::uuid, ${device.id}::uuid, ${contract.id}::uuid, ${hashPaymentLinkToken(paymentLinkToken)}, NOW())
        `);

        return { customer, device, contract, vouchers, permanentLicense, paymentUrl: paymentUrl(paymentLinkToken), idempotent: false };
      }, {
        // A full registration signs one license per installment plus a permanent license.
        // RSA signing can exceed Prisma's default 5-second interactive transaction timeout.
        maxWait: 10_000,
        timeout: 120_000
      });
    } catch (error) {
      console.error("[DEVICE_REGISTRATION_ERROR]", {
        dealerId,
        contractNumber: input.contract.contractNumber,
        deviceSerialNumber: input.device.serialNumber,
        error: error instanceof Error ? error.message : String(error),
        errorCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown",
        timestamp: new Date().toISOString()
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const retry = await prisma.contract.findFirst({ where: { dealerId, contractNumber: input.contract.contractNumber, deletedAt: null }, include: { customer: true, device: true, licenses: true } });
        if (retry && retry.deviceId) {
          const paymentLinkToken = createPaymentLinkToken(retry.deviceId, retry.id);
          await savePaymentLink(dealerId, retry.deviceId, retry.id, paymentLinkToken);
          return { customer: retry.customer, device: retry.device, contract: retry, vouchers: retry.licenses.filter((license) => license.licenseType === "temporary"), permanentLicense: retry.licenses.find((license) => license.licenseType === "permanent") ?? null, paymentUrl: paymentUrl(paymentLinkToken), idempotent: true };
        }
      }
      throw error;
    }
  },

  async createContract(dealerId: string, input: CreateContractInput) {
    await ensureActiveDealer(dealerId);
    return contractManagementService.create(dealerId, input);
  },

  async listPayments(dealerId: string, query: ListQueryInput) {
    await ensureActiveDealer(dealerId);

    const payments = await prisma.payment.findMany({
      where: {
        dealerId,
        deletedAt: null,
        ...(query.status ? { status: query.status as never } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        contract: true
      },
      ...pagination(query)
    });

    return pageResult(payments, query.take);
  },

  async reports(dealerId: string) {
    await ensureActiveDealer(dealerId);

    const [
      customerCount,
      deviceCount,
      contractCount,
      defaultedContracts,
      paymentCount,
      paymentTotals
    ] = await Promise.all([
      prisma.customer.count({ where: { dealerId, deletedAt: null } }),
      prisma.device.count({ where: { dealerId, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, status: ContractStatus.defaulted, deletedAt: null } }),
      prisma.payment.count({ where: { dealerId, deletedAt: null } }),
      prisma.payment.aggregate({
        where: { dealerId, status: PaymentStatus.successful, deletedAt: null },
        _sum: { amount: true }
      })
    ]);

    return {
      totals: {
        customers: customerCount,
        devices: deviceCount,
        contracts: contractCount,
        defaultedContracts,
        payments: paymentCount,
        successfulPaymentAmount: paymentTotals._sum.amount ?? 0
      }
    };
  },

  async getDealerProfile(dealerId: string) {
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId }
    });

    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer not found.");
    }

    return {
      id: dealer.id,
      name: dealer.name,
      legalName: dealer.legalName,
      email: dealer.email,
      phone: dealer.phone,
      country: dealer.country,
      timezone: dealer.timezone,
      slug: dealer.slug,
      status: dealer.status
      ,currency: typeof dealer.metadata === "object" && dealer.metadata && !Array.isArray(dealer.metadata) && typeof (dealer.metadata as Record<string, unknown>).currency === "string"
        ? ((dealer.metadata as Record<string, unknown>).currency as string).trim().toUpperCase()
        : "NGN"
    };
  },

  async updateDealerProfile(dealerId: string, input: UpdateDealerProfileInput) {
    const updateData: Record<string, any> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.legalName !== undefined) updateData.legalName = input.legalName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;

    const dealer = await prisma.dealer.update({
      where: { id: dealerId },
      data: updateData
    });

    return {
      id: dealer.id,
      name: dealer.name,
      legalName: dealer.legalName,
      email: dealer.email,
      phone: dealer.phone,
      country: dealer.country,
      timezone: dealer.timezone,
      slug: dealer.slug,
      status: dealer.status
    };
  }
};

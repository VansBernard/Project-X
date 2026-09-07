import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

type InitializeResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type VerifyResponse = {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  gateway_response: string;
  paid_at: string | null;
  customer?: {
    email?: string;
  };
  metadata?: unknown;
};

type CreateSubaccountResponse = {
  id: number;
  subaccount_code: string;
  business_name: string;
  settlement_bank: string | null;
  account_number: string | null;
  percentage_charge: number;
  status: string;
};

type CreateTransferRecipientResponse = {
  active: boolean;
  createdAt: string;
  currency: string;
  description: string | null;
  id: number;
  name: string;
  recipient_code: string;
  type: string;
  details?: {
    account_number?: string | null;
    bank_code?: string | null;
    bank_name?: string | null;
  };
  status: string;
};

type ResolveAccountResponse = {
  account_number: string;
  account_name: string;
  bank_id?: number;
};

type BankListItem = {
  name: string;
  code: string;
  active?: boolean;
  type?: string;
};

async function paystackRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(`${env.PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  const payload = (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !payload.status) {
    throw new AppError(
      502,
      "PAYSTACK_REQUEST_FAILED",
      payload.message || "Paystack request failed."
    );
  }

  return payload;
}

export const paystackClient = {
  initialize(input: {
    email: string;
    amountKobo: number;
    reference: string;
    currency: string;
    callbackUrl?: string;
    metadata: Record<string, unknown>;
    subaccount?: string;
    bearer?: "account" | "subaccount";
  }) {
    return paystackRequest<InitializeResponse>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        reference: input.reference,
        currency: input.currency,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
        subaccount: input.subaccount,
        bearer: input.bearer
      })
    });
  },

  verify(reference: string) {
    return paystackRequest<VerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET"
    });
  },

  createSubaccount(input: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
    percentageCharge: number;
    primaryContactEmail?: string;
    primaryContactName?: string;
    primaryContactPhone?: string;
  }) {
    return paystackRequest<CreateSubaccountResponse>("/subaccount", {
      method: "POST",
      body: JSON.stringify({
        business_name: input.businessName,
        settlement_bank: input.settlementBank,
        account_number: input.accountNumber,
        percentage_charge: input.percentageCharge,
        primary_contact_email: input.primaryContactEmail,
        primary_contact_name: input.primaryContactName,
        primary_contact_phone: input.primaryContactPhone
      })
    });
  },

  createTransferRecipient(input: {
    type: "nuban" | "ghipss" | "kepss" | "basa" | "mobile_money" | "mobile_money_business";
    name: string;
    accountNumber: string;
    bankCode?: string;
    currency?: string;
    description?: string;
  }) {
    return paystackRequest<CreateTransferRecipientResponse>("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({
        type: input.type,
        name: input.name,
        account_number: input.accountNumber,
        bank_code: input.bankCode,
        currency: input.currency,
        description: input.description
      })
    });
  },

  deactivateTransferRecipient(recipientCode: string) {
    return paystackRequest<CreateTransferRecipientResponse>(`/transferrecipient/${encodeURIComponent(recipientCode)}`, {
      method: "PUT",
      body: JSON.stringify({ active: false })
    });
  },

  resolveAccount(input: { accountNumber: string; bankCode: string }) {
    const query = new URLSearchParams({
      account_number: input.accountNumber,
      bank_code: input.bankCode
    });

    return paystackRequest<ResolveAccountResponse>(`/bank/resolve?${query.toString()}`, {
      method: "GET"
    });
  },

  listBanks(country: "ghana" | "kenya" | "nigeria" | "south africa") {
    const query = new URLSearchParams({ country, perPage: "100" });
    return paystackRequest<BankListItem[]>(`/bank?${query.toString()}`, { method: "GET" });
  },

  initiateTransfer(input: { amountSubunit: number; recipient: string; reference: string; currency: string; reason: string }) {
    return paystackRequest<{ transfer_code: string; status: string }>("/transfer", {
      method: "POST",
      body: JSON.stringify({
        source: "balance",
        amount: input.amountSubunit,
        recipient: input.recipient,
        reference: input.reference,
        currency: input.currency,
        reason: input.reason
      })
    });
  }
};

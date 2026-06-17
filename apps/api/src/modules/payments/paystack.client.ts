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
  }) {
    return paystackRequest<InitializeResponse>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        reference: input.reference,
        currency: input.currency,
        callback_url: input.callbackUrl,
        metadata: input.metadata
      })
    });
  },

  verify(reference: string) {
    return paystackRequest<VerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET"
    });
  }
};


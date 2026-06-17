# Paystack Integration

This module owns Paystack payment initialization, server-side validation, verified webhook processing, retry metadata, and transaction logging.

## Routes

```text
POST /api/v1/payments/paystack/initialize
POST /api/v1/payments/paystack/validate
POST /api/v1/payments/paystack/retry
POST /api/v1/webhooks/paystack
```

## Trust Rule

Frontend callbacks are never trusted for payment state changes.

`/payments/paystack/validate` verifies a reference with Paystack and logs the attempt, but it does not mark a payment successful. Successful payment state is only applied after `/webhooks/paystack` verifies the `x-paystack-signature` header and processes a trusted Paystack webhook.

## Database Integration

- `payments`: local payment records and final server state.
- `payment_attempts`: initialization, validation, retry, and processing logs.
- `payment_webhook_events`: raw verified webhook event records with idempotency.

## Retry Handling

Failed initialization and validation attempts record `next_retry_at`. A future worker can process attempts where `next_retry_at` is due. This module creates the retry metadata but does not create a background worker.

## Out Of Scope

This module does not implement license logic, unlock logic, or contract balance mutation.

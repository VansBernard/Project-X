# License Delivery System

This delivery layer runs after a verified successful Paystack webhook.

## Flow

1. Paystack webhook is verified.
2. Payment is marked successful.
3. A license delivery job is queued.
4. The job generates, signs, and saves a license through the license engine.
5. The license email is sent to the customer through Nodemailer.
6. Failures are stored with retry metadata.

## Email Contents

The license email includes:

- Customer name
- Device information
- Payment information
- Expiration date
- License key

## Queue And Retry

Jobs are stored in `license_delivery_jobs`.

Failed jobs move to `retrying` until `LICENSE_DELIVERY_MAX_ATTEMPTS` is reached. Due retry jobs can be processed through:

```text
POST /api/v1/licenses/delivery/retries/process
```

## Trust Boundary

The delivery system is triggered only after backend-verified successful payment state. Frontend callbacks do not create licenses and do not send license emails.

## Out Of Scope

This module does not build desktop validation.


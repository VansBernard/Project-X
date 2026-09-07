# Environment Setup

Project X uses environment variables for database access, authentication, Paystack, SMTP email, and RSA license signing.

Create the API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

## Database

```env
DATABASE_URL=postgresql://user:password@localhost:5432/project_x
```

For Supabase, use the PostgreSQL connection string from the Supabase project settings.

## Server

```env
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:5173
```

## JWT

```env
JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=30
AUTH_TOKEN_TTL_MINUTES=30
PASSWORD_RESET_TTL_MINUTES=30
```

Generate development JWT secrets:

```bash
npm run generate:jwt
```

## Paystack

```env
PAYSTACK_SECRET_KEY=sk_test_replace_me
PAYSTACK_PUBLIC_KEY=pk_test_replace_me
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_MAX_RETRY_ATTEMPTS=3
```

Use test keys for development and live keys only in production.

Production requirements:

- `PAYSTACK_SECRET_KEY` must start with `sk_live_`.
- `PAYSTACK_PUBLIC_KEY` must start with `pk_live_`.
- `PAYMENT_PORTAL_BASE_URL` must use the deployed HTTPS host.
- `WEB_ORIGIN` must contain only deployed frontend origins; localhost is rejected.
- `DATABASE_URL` must include `sslmode=require`.

## RSA 4096 License Keys

```env
LICENSE_PRIVATE_KEY_PEM_BASE64=<generated-private-key-base64>
LICENSE_PUBLIC_KEY_PEM=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
LICENSE_KEY_ID=default
```

Generate development RSA keys:

```bash
npm run generate:rsa
```

Rules:

- The private key stays backend-only.
- The private key must never be committed.
- The desktop client stores only the public key.
- Rotate keys by generating a new pair and changing `LICENSE_KEY_ID`.

## SMTP

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=replace_me
SMTP_PASS=replace_me
EMAIL_FROM=Project X <no-reply@example.com>
LICENSE_DELIVERY_MAX_ATTEMPTS=5
```

For Gmail, use an app password rather than the account password.

## Complete Development Template

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://project_x:password@localhost:5432/project_x
WEB_ORIGIN=http://localhost:5173

JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=30
AUTH_TOKEN_TTL_MINUTES=30
PASSWORD_RESET_TTL_MINUTES=30

PAYSTACK_SECRET_KEY=sk_test_replace_me
PAYSTACK_PUBLIC_KEY=pk_test_replace_me
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_MAX_RETRY_ATTEMPTS=3

LICENSE_PRIVATE_KEY_PEM_BASE64=<generated-private-key-base64>
LICENSE_PUBLIC_KEY_PEM=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
LICENSE_KEY_ID=default

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=replace_me
SMTP_PASS=replace_me
EMAIL_FROM=Project X <no-reply@example.com>
LICENSE_DELIVERY_MAX_ATTEMPTS=5
```

## Validation

After configuring `.env`:

```bash
npm run db:validate
npm run db:generate
npm run build:api
```


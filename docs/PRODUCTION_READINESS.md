# Project X Production Readiness Plan

## Current status

The project is in a solid foundation stage, but it is not yet production-ready.

Verified evidence:
- API build succeeded with `npm --workspace apps/api run build`
- Admin build succeeded with `npm --workspace apps/admin run build`
- The backend and frontend compile cleanly in the current workspace

Outstanding risk areas:
- database migration and schema verification need explicit production validation
- secrets and environment configuration need hardening for real deployment
- authentication, authorization, and payments need staged security review
- deployment pipeline and monitoring are still missing

## High-priority production gaps

### 1. Environment and secrets
- move all secrets to a real deployment secret manager
- separate development, staging, and production values
- enforce `.env` exclusion and secret rotation policy
- validate required variables for every environment before deployment

### 2. Database readiness
- run a fresh Prisma migration rehearsal against a staging database
- verify all models, indexes, and constraints match intended production behavior
- check migration rollback strategy and backup process
- confirm Postgres connection pooling and transaction defaults are production-safe
- use `prisma migrate deploy` for deployed environments; do not use the custom SQL-splitting migration runner in production

### 3. Auth and session hardening
- verify JWT refresh flow, expiry handling, and logout behavior in production mode
- restrict session lifetime and rotation rules
- enforce strong password policy and lockout rules
- audit routes for dealer/user/admin authorization boundaries

### 4. Payment and licensing security
- validate Paystack webhook signature verification end-to-end
- ensure idempotency and retry logic are safe for duplicate webhooks
- review RSA license issuance and validation flow for tamper resistance
- test expired, revoked, and suspended license states
- replace the in-process API rate limiter with a shared store such as Redis before running multiple API instances
- atomically claim license-delivery jobs so concurrent webhook or retry workers cannot issue duplicate licenses

### 5. Infrastructure and deployment
- define production hosting targets for API, admin dashboard, and database
- add CI pipeline with lint, build, migration validation, and test gates
- add deployment checks for health endpoints and smoke tests
- configure monitoring, logs, alerting, and error capture

### 6. Operational quality
- add automated tests beyond build validation
- add integration tests for auth, contracts, license flow, payments, and dashboard access
- create runbooks for incidents, outages, and DB recovery
- document production rollback steps

## Recommended production sequence

### Phase 1: Stabilize foundation
1. lock the production environment variables
2. verify Prisma against a staging DB
3. confirm API auth and session flows
4. enforce stricter CORS and security headers

### Phase 2: Validate business flows
1. dealer sign-up and login
2. customer and device registration
3. contract creation and installment flow
4. Paystack payment lifecycle
5. license issuance, validation, and lock-screen behavior

Current Phase 2 status:

- payment settlement is idempotent at the payment-status transition
- license-delivery jobs are atomically claimed before processing
- API unit tests cover payment settlement and license signing/verification
- full staging end-to-end validation still requires a reachable staging database and Paystack test webhooks

### Phase 3: Production deployment prep
1. CI + deployment pipeline
2. health checks and smoke tests
3. monitoring and log retention
4. release checklist and rollback plan

## Suggested next actions

- finalize `.env.production` contract
- run Prisma migration validation in staging
- harden auth/session review for access tokens and refresh tokens
- review the Paystack webhook payload and signature verification path
- add health, readiness, and error monitoring endpoints
- define deployment target and release branch policy

## Recommendation

The project is ready for a serious production-prep sprint, but not for a launch release yet. The next milestone should be: "staging-ready with verified DB migrations, auth flows, and payment/license tests".

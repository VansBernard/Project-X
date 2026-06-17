# Security Architecture

Project X handles customer records, payment records, device control state, and tenant operations. Security must be part of the foundation, not a later retrofit.

## Security Goals

- Prevent cross-tenant data access.
- Protect customer and payment-related data.
- Keep payment and device state trustworthy.
- Treat desktop clients as untrusted.
- Make sensitive operations auditable.
- Keep secrets out of source control and client bundles.

## Actor Types

- Tenant staff user.
- Tenant administrator.
- Platform administrator.
- Desktop device client.
- Worker process.
- Paystack webhook sender.

## Identity And Access Controls

Required foundations:

- Strong password hashing.
- Session or token invalidation.
- Refresh-token rotation if JWTs are used.
- Role-based access control.
- MFA-ready user model.
- Separate platform admin access.
- Audit logs for privilege changes.

## Tenant Isolation Controls

Controls:

- `tenant_id` on all tenant-owned records.
- Tenant context required for tenant-scoped services.
- Repository methods requiring tenant ID.
- Authorization checks before returning or mutating records.
- Cross-tenant denial tests.
- Platform admin override logging.

## Payment Security

Paystack controls:

- Server-side Paystack secret storage only.
- Webhook signature verification using raw request body.
- Webhook event idempotency.
- Server-side transaction verification.
- No trust in frontend payment status.
- Redacted payment logs.
- Reconciliation audit records.

## Desktop Security

Desktop controls:

- Per-device credentials.
- Encrypted local state where practical.
- Signed installer.
- Update metadata verification.
- No tenant-wide secrets in the desktop binary.
- Server-authoritative access state.
- Command expiration and acknowledgement.
- Local event upload for security-relevant activity.

Threat assumptions:

- Users may have physical access to financed laptops.
- Local files may be inspected or modified.
- Network calls may be interrupted or replayed.
- Local state may be stale.
- The backend must not trust unauthenticated desktop claims.

## API Security

API controls:

- HTTPS in staging and production.
- Security headers.
- Strict CORS allowlist.
- Request body size limits.
- Rate limits by IP, actor, route, and tenant where appropriate.
- Schema validation for all inbound requests.
- Centralized error handling.
- Sensitive field redaction in logs.

## Database Security

Database controls:

- Least-privilege database users.
- Migration-only elevated privileges.
- Database backups.
- Restore testing.
- Foreign keys and unique constraints.
- Encryption at rest through managed provider capabilities.
- Supabase row-level security if direct client access is introduced.

## Secrets Management

Secrets:

- Database URLs.
- Supabase keys.
- Paystack secret keys.
- Webhook signing secrets.
- JWT/session secrets.
- Email/SMS provider secrets.
- Desktop signing keys.

Rules:

- No secrets in Git.
- No secrets in frontend bundles.
- No tenant-wide secrets in desktop binaries.
- Environment-specific secret stores.
- Rotation plan for compromised secrets.

## Audit Logging

Audit logs should capture:

- Actor.
- Tenant.
- Action.
- Target resource.
- Timestamp.
- Request ID.
- IP and user agent where applicable.
- Safe before/after summaries for sensitive changes.

Audit-required events:

- Login and failed login.
- User, role, and permission changes.
- Contract status changes.
- Payment reconciliation changes.
- Device registration.
- Device command creation and acknowledgement.
- Platform admin access.
- Tenant settings changes.


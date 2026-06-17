# Database Architecture

The database foundation must support tenant isolation, financial traceability, device state, audit history, and future reporting.

Technology:

- Supabase PostgreSQL
- Prisma ORM
- Prisma migrations

## Core Schema Areas

### Identity And Tenancy

Tables:

- `tenants`
- `tenant_settings`
- `users`
- `tenant_users`
- `roles`
- `permissions`
- `role_permissions`
- `sessions`
- `api_keys`

Purpose:

- Separate user identity from tenant membership.
- Support users belonging to multiple tenants.
- Support role-based access control.
- Support service credentials without treating services as users.

### Customers

Tables:

- `customers`
- `customer_contacts`
- `customer_documents`
- `customer_notes`

Purpose:

- Store financed customer profiles.
- Keep contact records and documents separate.
- Preserve operational notes without mixing them into the customer core record.

### Contracts

Tables:

- `contracts`
- `contract_terms`
- `repayment_schedules`
- `repayment_installments`
- `contract_status_history`

Purpose:

- Represent financing agreements.
- Store terms separately from customer and device records.
- Track expected repayment structure.
- Preserve contract state changes.

### Devices

Tables:

- `devices`
- `device_registrations`
- `device_assignments`
- `device_status_history`
- `device_commands`
- `device_command_attempts`
- `device_telemetry`

Purpose:

- Represent physical laptops.
- Link devices to tenants, customers, and contracts.
- Track server-authoritative device status.
- Queue commands for desktop clients.
- Store sync, heartbeat, and telemetry metadata.

### Payments

Tables:

- `payment_accounts`
- `payment_intents`
- `payment_transactions`
- `payment_webhook_events`
- `payment_reconciliations`
- `refunds`

Purpose:

- Represent Paystack payment lifecycle.
- Persist webhook events for idempotency.
- Separate gateway events from reconciled internal state.
- Support payment auditability.

### Audit And Operations

Tables:

- `audit_events`
- `security_events`
- `system_jobs`
- `job_attempts`
- `notifications`
- `notification_attempts`

Purpose:

- Preserve critical operational events.
- Support troubleshooting.
- Track background processing and notification attempts.

## Tenant Ownership

All tenant-owned business tables must include:

- `tenant_id`
- `created_at`
- `updated_at`
- Optional `deleted_at` for soft deletion where historical references matter.

Tenant-owned tables include customers, contracts, devices, payments, notifications, and audit events.

Platform-owned tables include tenants, global users, platform administrators, and global configuration records.

## Keys And Constraints

Recommendations:

- Use UUID primary keys.
- Use foreign keys for core relationships.
- Use unique constraints for external provider references.
- Use composite uniqueness for tenant-scoped natural identifiers.
- Avoid hard deletes for financial, device, and audit records.

Example constraint categories:

- Unique Paystack transaction reference.
- Unique Paystack webhook event ID.
- Unique device serial or hardware fingerprint per tenant, where applicable.
- Unique user email globally or by identity provider strategy.

## Indexing Strategy

Baseline indexes:

- Every `tenant_id`.
- Every foreign key used in joins.
- `(tenant_id, status)` for operational lists.
- `(tenant_id, created_at)` for activity and reporting.
- Provider reference indexes for payment lookups.
- Device identity indexes for desktop sync.

## Prisma Usage

Prisma should provide:

- Type-safe database access.
- Migration workflow.
- Transaction handling.
- Generated client types.

Prisma should not replace:

- Database constraints.
- Authorization checks.
- Webhook idempotency constraints.
- Migration review.

## Supabase Usage

The backend API should be the primary database access path.

Direct frontend Supabase access should be avoided in the foundation phase. If introduced later, row-level security policies must be designed, tested, and documented before client access is enabled.


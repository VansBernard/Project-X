# Multi-Tenant Architecture

Project X should begin with shared application services and a shared PostgreSQL database using explicit tenant scoping. This is the simplest foundation that still supports strong isolation when implemented carefully.

## Initial Tenancy Model

- Shared API service.
- Shared worker service.
- Shared web application.
- Shared PostgreSQL database.
- Shared tables with `tenant_id`.
- Tenant-aware authorization in the API.
- Optional row-level security if direct Supabase access is later used.

## Tenant-Owned Data

Tenant-owned records include:

- Customers.
- Contracts.
- Devices.
- Payment records.
- Notifications.
- Uploaded document metadata.
- Audit events.
- Tenant settings.

Platform-owned records include:

- Tenant records.
- Global user identity records.
- Platform administrator records.
- Global configuration.

## Tenant Context

Tenant context should be resolved before tenant-scoped logic runs.

Context fields:

- Tenant ID.
- Actor ID.
- Actor type.
- Membership ID where applicable.
- Role and permissions.
- Request ID.
- Platform override flag where applicable.

## Tenant Resolution Sources

Tenant can be resolved from:

- Authenticated user membership.
- Selected tenant workspace.
- Workspace subdomain in the future.
- Desktop device registration.
- Trusted payment references during webhook processing.
- Platform admin override.

## Isolation Rules

Baseline rules:

- Tenant users can only access active tenant memberships.
- Desktop devices can only access their own tenant and device scope.
- Paystack webhooks resolve tenant through stored trusted references.
- Background jobs carry tenant context.
- Platform admin cross-tenant access is explicit and audited.

## Database Isolation

Database controls:

- `tenant_id` foreign keys.
- Tenant-aware composite indexes.
- Tenant-aware unique constraints.
- No hard deletes for audit, payment, contract, or device history.
- Optional row-level security policies for direct client access.

## Application Isolation

Application controls:

- Tenant context middleware.
- Repository helpers requiring tenant ID.
- Service method signatures that accept tenant context.
- Authorization checks on every tenant-scoped action.
- Cross-tenant test cases.

## Future Isolation Options

If enterprise or regulatory requirements demand stronger isolation, the architecture can evolve toward:

- Dedicated schema per tenant.
- Dedicated database per tenant.
- Dedicated worker queues per tenant.
- Dedicated deployment per tenant.

The foundation should not implement those options now, but it should avoid assumptions that make them impossible later.


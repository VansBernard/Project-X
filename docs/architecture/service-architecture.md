# Service Architecture

Project X should start as a modular monolith with separate deployable processes for the API, worker, web app, and desktop client.

## Runtime Components

### API Service

Technology: Node.js, Express, TypeScript, Prisma.

Responsibilities:

- Authenticate users, devices, workers, and webhook calls.
- Resolve tenant context.
- Authorize tenant-scoped operations.
- Expose REST API endpoints.
- Coordinate domain services.
- Persist data through Prisma.
- Receive Paystack webhooks.
- Expose desktop synchronization endpoints.
- Emit jobs and audit events.

### Worker Service

Technology: Node.js, TypeScript.

The worker can share the backend codebase and run as a separate process.

Responsibilities:

- Process asynchronous jobs.
- Process payment webhooks after ingestion.
- Reconcile payment records.
- Run scheduled checks.
- Send notifications.
- Expire or retry desktop commands.
- Record operational outcomes.

### Web Application

Technology: React, TypeScript, TailwindCSS.

Responsibilities:

- Provide tenant staff workspace.
- Manage customers, contracts, devices, payments, and settings.
- Display operational dashboards.
- Consume the backend API through typed clients.
- Enforce client-side route guards while relying on server authorization.

### Desktop Client

Technology: WPF, .NET 8, MVVM.

Responsibilities:

- Register the financed laptop with the platform.
- Maintain local device identity.
- Sync with the backend API.
- Poll and acknowledge server-created commands.
- Display device/payment/access state.
- Store limited encrypted local state.

### Database

Technology: Supabase PostgreSQL.

Responsibilities:

- Persist tenant, user, customer, contract, device, payment, audit, and job data.
- Enforce relational integrity.
- Support tenant-aware indexing.
- Support row-level security if direct Supabase client access is later introduced.

### Paystack Integration

Responsibilities:

- Payment initialization boundary.
- Transaction verification boundary.
- Webhook ingestion and signature validation.
- Idempotency and reconciliation support.

## Backend Module Layout

Each API module should follow this shape:

```text
module/
  module.routes.ts
  module.controller.ts
  module.service.ts
  module.repository.ts
  module.schemas.ts
  module.types.ts
  module.test.ts
```

## Dependency Direction

```text
routes -> controllers -> services -> repositories -> Prisma
                          services -> integrations
                          services -> jobs
```

Rules:

- Routes do not call Prisma directly.
- Controllers handle HTTP concerns only.
- Services contain coordination logic.
- Repositories own persistence queries.
- Integrations isolate external APIs.
- Workers call services instead of duplicating behavior.
- Shared contracts contain types and schemas only.

## Initial Backend Modules

- `auth`: identity, sessions, token handling, device authentication boundary.
- `tenants`: tenant records, settings, tenant lifecycle.
- `users`: staff users, memberships, roles, invitations.
- `customers`: financed customer records.
- `contracts`: financing agreement records and status history.
- `devices`: laptop records, registrations, telemetry, command queue.
- `payments`: Paystack records, transactions, webhooks, reconciliation.
- `notifications`: email/SMS/provider abstraction.
- `audit`: immutable audit and security events.
- `admin`: platform-level operations.

## Deployment Units

Initial deployment units:

- `api`: Express HTTP service.
- `worker`: background job process.
- `web`: static React build.
- `desktop`: signed Windows installer.
- `database`: Supabase PostgreSQL project.

## Environments

Required environments:

- `local`
- `staging`
- `production`

Each environment needs isolated configuration for database access, Supabase, Paystack, signing secrets, session/JWT secrets, email/SMS providers, and desktop update endpoints.


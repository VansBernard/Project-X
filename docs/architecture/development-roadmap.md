# Development Roadmap

This roadmap sequences foundation work before business logic. Each phase should produce reviewable artifacts and tests where applicable.

## Phase 0: Architecture And Repository Foundation

Goals:

- Approve architecture documents.
- Create monorepo structure.
- Add workspace package management.
- Add base documentation.
- Add CI skeleton.

Deliverables:

- Architecture docs.
- Root README.
- Workspace configuration.
- GitHub Actions baseline.

## Phase 1: Backend Foundation

Goals:

- Create Express TypeScript API shell.
- Add configuration loading.
- Add structured logging.
- Add request IDs.
- Add health endpoint.
- Add centralized error handling.
- Add test framework.

Deliverables:

- API starts locally.
- Health check works.
- Tests run in CI.

## Phase 2: Database Foundation

Goals:

- Add Prisma.
- Connect to Supabase PostgreSQL.
- Define base identity and tenancy schema.
- Add migration workflow.
- Add seed structure.

Deliverables:

- Prisma schema.
- Initial migration.
- Database connection verification.
- Seed command.

## Phase 3: Identity And Tenancy Foundation

Goals:

- Add user and tenant models.
- Add tenant membership model.
- Add role and permission model.
- Add tenant context middleware.
- Add authorization structure.

Deliverables:

- Auth boundary.
- Tenant-aware request context.
- RBAC foundation.
- Cross-tenant access tests.

## Phase 4: Core Domain Schema Foundation

Goals:

- Add schema for customers, contracts, devices, payments, and audit.
- Add repository conventions.
- Add validation conventions.
- Add shared contract package patterns.

Deliverables:

- Core database tables.
- Repository pattern.
- DTO and validation structure.
- Migration tests where practical.

## Phase 5: Web App Foundation

Goals:

- Create React TypeScript app.
- Configure TailwindCSS.
- Add route shell.
- Add authenticated layout shell.
- Add typed API client boundary.
- Add reusable UI primitives.

Deliverables:

- Web app starts locally.
- Tenant workspace shell.
- API client foundation.
- UI structure.

## Phase 6: Desktop Foundation

Goals:

- Create WPF .NET 8 solution.
- Add MVVM folder structure.
- Add dependency injection.
- Add configuration and logging.
- Add API client abstraction.
- Add local storage abstraction.

Deliverables:

- Desktop app builds.
- Unit test project.
- Desktop service boundaries.
- Local state abstraction.

## Phase 7: Payment Integration Foundation

Goals:

- Add Paystack configuration.
- Add webhook route boundary.
- Add raw body signature verification structure.
- Add webhook persistence.
- Add idempotency constraints.
- Add reconciliation job shell.

Deliverables:

- Paystack webhook ingestion shell.
- Payment event storage.
- Worker processing structure.
- Audit-ready payment events.

## Phase 8: Device Communication Foundation

Goals:

- Add desktop registration API boundary.
- Add heartbeat endpoint boundary.
- Add sync endpoint boundary.
- Add command queue schema.
- Add command polling and acknowledgement contracts.

Deliverables:

- Desktop API route group.
- Device credential model.
- Command lifecycle schema.
- Desktop sync service skeleton.

## Phase 9: Operational Readiness

Goals:

- Add deployment documentation.
- Add environment documentation.
- Add logging and monitoring plan.
- Add backup and restore plan.
- Add desktop signing and distribution plan.
- Add security checklist.

Deliverables:

- Deployment runbook.
- Security checklist.
- Monitoring baseline.
- Backup and restore checklist.
- Release checklist.

## Phase 10: Business Logic Implementation

Business logic begins only after the foundation is approved. Each feature should include database migrations, API contracts, backend services, frontend screens, desktop behavior where needed, tests, and audit events.


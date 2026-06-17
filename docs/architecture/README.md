# Project X Architecture

Project X is a pay-as-you-go laptop financing platform. It supports organizations that finance laptops, collect recurring payments, manage financed devices, and coordinate device access through a Windows desktop client.

This documentation defines the foundation only. It does not include business logic, implementation code, UI screens, payment workflows, or device enforcement behavior.

## Documents

- [Folder Structure](./folder-structure.md)
- [Service Architecture](./service-architecture.md)
- [Database Architecture](./database-architecture.md)
- [API Architecture](./api-architecture.md)
- [Desktop Architecture](./desktop-architecture.md)
- [Security Architecture](./security-architecture.md)
- [Multi-Tenant Architecture](./multi-tenant-architecture.md)
- [Development Roadmap](./development-roadmap.md)

## Stack

Backend:

- Node.js
- Express
- TypeScript
- Prisma ORM
- Supabase PostgreSQL

Frontend:

- React
- TypeScript
- TailwindCSS

Desktop client:

- WPF
- .NET 8
- MVVM

Payments:

- Paystack

## System Boundaries

Project X is split into the following major boundaries:

- Web app: browser-based tenant operations interface.
- API service: authenticated backend API for web, desktop, payment, and internal workers.
- Worker service: asynchronous jobs, webhook processing, reconciliation, notifications, and scheduled checks.
- Database: Supabase PostgreSQL accessed primarily through Prisma.
- Desktop client: WPF app installed on financed Windows laptops.
- Payment integration: Paystack payment initialization, verification, webhook ingestion, and reconciliation.

## Architecture Principles

- Tenant isolation is explicit and tested.
- Financial and device-access state is server-authoritative.
- Desktop clients are treated as untrusted clients.
- Payment events are idempotent and auditable.
- Sensitive operations produce audit events.
- The first version is a modular monolith, not a distributed system.
- Module boundaries should be clean enough to extract services later if needed.


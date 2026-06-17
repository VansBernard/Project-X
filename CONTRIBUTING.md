# Contributing

Project X is still in foundation development. Keep changes small, explicit, and aligned with the architecture documents.

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run generate:all
npm run db:validate
npm run db:generate
npm run build:api
```

See [docs/ENV_SETUP.md](docs/ENV_SETUP.md) for required environment variables.

## Workflow

1. Create a branch.
2. Make a focused change.
3. Run validation.
4. Update docs when behavior or setup changes.
5. Commit with a clear message.

Recommended checks:

```bash
npm run db:validate
npm run build:api
npm run test
```

## Commit Style

Use simple conventional commit prefixes:

```text
feat: add contract status endpoint
fix: correct license expiration check
docs: update environment setup
chore: clean workspace scripts
```

## Backend Module Pattern

Backend modules should follow this shape:

```text
module/
  module.schemas.ts
  module.service.ts
  module.controller.ts
  module.routes.ts
  README.md
```

Keep responsibilities separate:

- Schemas validate request input.
- Controllers handle HTTP concerns.
- Services own business rules.
- Routes wire middleware, validation, and controllers.
- Prisma access should stay inside services or dedicated repositories when introduced.

## Database Changes

When changing the database:

1. Update `apps/api/prisma/schema.prisma`.
2. Add a migration under `apps/api/prisma/migrations/`.
3. Run:

```bash
npm run db:validate
npm run db:generate
npm run build:api
```

Use UUID primary keys, foreign keys, indexes, and soft deletes where appropriate.

## Security Rules

- Never commit `.env`, private keys, PEM files, or generated key folders.
- Backend owns private RSA license signing keys.
- Desktop receives only public keys.
- Frontend payment callbacks are never trusted for payment success.
- Only verified Paystack webhooks can mark payments successful.
- Dealer-scoped data must always be filtered by `dealerId`.

## Documentation

Update documentation when you change:

- setup steps
- environment variables
- routes
- database schema
- security boundaries
- module responsibilities

Relevant docs live in:

```text
docs/architecture/
docs/security/
docs/ENV_SETUP.md
docs/SETUP.md
apps/api/src/modules/*/README.md
```


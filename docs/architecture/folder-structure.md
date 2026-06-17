# Folder Structure

Project X should use a monorepo. This keeps the backend, frontend, desktop client, shared contracts, infrastructure, and documentation aligned while the product foundation is still forming.

```text
Project X/
  apps/
    api/
      src/
        config/
        middleware/
        modules/
          auth/
          tenants/
          users/
          customers/
          contracts/
          devices/
          payments/
          notifications/
          audit/
          admin/
        jobs/
        integrations/
          paystack/
          supabase/
        prisma/
        utils/
        tests/
      prisma/
        schema.prisma
        migrations/
        seed/
      package.json
      tsconfig.json
      .env.example

    web/
      src/
        app/
        components/
        features/
          auth/
          dashboard/
          customers/
          contracts/
          devices/
          payments/
          settings/
        hooks/
        lib/
        routes/
        services/
        styles/
        tests/
      public/
      package.json
      tsconfig.json
      tailwind.config.ts
      .env.example

    desktop/
      ProjectX.Desktop/
        Views/
        ViewModels/
        Models/
        Services/
        Infrastructure/
        Resources/
        App.xaml
      ProjectX.Desktop.Tests/
      ProjectX.Desktop.sln

  packages/
    contracts/
      src/
        api/
        events/
        validation/
      package.json
      tsconfig.json

    config/
      eslint/
      typescript/
      tailwind/

  docs/
    architecture/
    product/
    security/
    operations/

  infra/
    supabase/
      policies/
      storage/
      migrations/
    docker/
    github/

  scripts/
    dev/
    db/
    ci/

  .github/
    workflows/

  package.json
  pnpm-workspace.yaml
  README.md
```

## Area Responsibilities

`apps/api` contains the Express API, workers, Prisma integration, backend modules, and backend tests.

`apps/web` contains the React tenant portal and all browser-facing user experience.

`apps/desktop` contains the WPF .NET 8 desktop client and desktop tests.

`packages/contracts` contains shared DTOs, API response types, event schemas, and validation contracts. It must not contain business logic.

`packages/config` contains shared linting, TypeScript, Tailwind, and formatting configuration.

`infra` contains infrastructure configuration for Supabase, CI, local development support, and deployment assets.

`docs` contains architecture, product, operations, and security documentation.

## Naming Standards

- Database tables: `snake_case` plural names.
- Backend modules: lowercase plural domain names.
- TypeScript files: `kebab-case`.
- React components: `PascalCase`.
- C# classes and files: `PascalCase`.
- Environment examples: `.env.example`.


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

    DesktopApp1/
      DesktopAppFresh/
        App.xaml
        DesktopAppFresh.csproj
        LoginWindow.xaml
        RegistrationWindow.xaml
        DashboardWindow.xaml
        LockWindow.xaml
        MainWindow.xaml

    # Note: the current desktop prototype is located in apps/DesktopApp1/DesktopAppFresh. The planned production desktop client structure is apps/desktop/ProjectX.Desktop.

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

`apps/desktop` is the planned WPF .NET 8 desktop client location. The canonical current desktop prototype lives in `apps/DesktopApp1/DesktopAppFresh` and should be used for present development.

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


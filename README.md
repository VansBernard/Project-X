# Project X

Project X is a pay-as-you-go laptop financing platform. It combines a Node.js API, Supabase PostgreSQL database, Paystack payments, RSA-signed licenses, and a WPF desktop client for offline license validation.

## Current Scope

The repository currently contains the backend foundation, architecture documentation, security documentation, and early desktop licensing components.

Built backend modules:

- Authentication and authorization
- Dealer management
- Customer management
- Contract management
- Paystack integration
- License engine
- License delivery

Desktop prototype:

- Canonical current desktop prototype: `apps/DesktopApp1/DesktopAppFresh`
- WPF .NET 8 MVVM structure with login, registration, dashboard, and lock workflows
- Offline license cache and validation concepts
- RSA signature verification examples
- Device ownership and expiration checks
- Future production desktop structure is planned under `apps/desktop/ProjectX.Desktop` as a conceptual layout only

## Technology Stack

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

Desktop:

- WPF
- .NET 8
- MVVM

Payments and licensing:

- Paystack
- Nodemailer
- RSA 4096 license signing

## Repository Structure

```text
Project X/
  apps/
    api/
      prisma/
      src/
        config/
        lib/
        middleware/
        modules/
      package.json
      tsconfig.json
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

  docs/
    architecture/
    security/
    ENV_SETUP.md
    SETUP.md

  scripts/
    generate-jwt-keys.js
    generate-rsa-keys.js

  package.json
  README.md
  CONTRIBUTING.md
```

## Quick Start

Install dependencies:

```bash
npm install
```

Copy API environment variables:

```bash
cp apps/api/.env.example apps/api/.env
```

Generate development secrets:

```bash
npm run generate:all
```

Validate and generate Prisma:

```bash
npm run db:validate
npm run db:generate
```

Build the API:

```bash
npm run build:api
```

Start the API:

```bash
npm run dev:api
```

Health check:

```bash
curl http://localhost:4000/api/v1/health
```

## Workspace Scripts

```bash
npm run dev:api          # Start API in watch mode
npm run build:api        # Compile the API
npm run start:api        # Start compiled API
npm run db:validate      # Validate Prisma schema
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run Prisma migrate dev
npm run db:studio        # Open Prisma Studio
npm run generate:jwt     # Generate JWT secrets
npm run generate:rsa     # Generate RSA 4096 license keys
npm run generate:all     # Generate JWT and RSA keys
npm run check            # Validate schema and build API
```

## Environment Setup

Environment configuration is documented in [docs/ENV_SETUP.md](docs/ENV_SETUP.md).

Required categories:

- Database URL
- JWT secrets
- Paystack keys
- SMTP credentials
- RSA 4096 license keys
- CORS origin

## Documentation

- [Architecture Overview](docs/architecture/README.md)
- [API Architecture](docs/architecture/api-architecture.md)
- [Database Architecture](docs/architecture/database-architecture.md)
- [Desktop Architecture](docs/architecture/desktop-architecture.md)
- [Security Architecture](docs/architecture/security-architecture.md)
- [License Engine Security](docs/security/license-engine.md)
- [Offline License Validation](docs/security/offline-license-validation.md)
- [Environment Setup](docs/ENV_SETUP.md)
- [Development Setup](docs/SETUP.md)

## Development Status

Project X is in foundation development. The backend compiles and the Prisma schema validates. The next major product step is the React admin dashboard foundation.


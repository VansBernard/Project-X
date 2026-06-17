# Development Setup

This guide sets up Project X for local backend development.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- PostgreSQL 12 or newer, or a Supabase PostgreSQL connection string
- Git
- Optional for desktop development: Visual Studio 2022 and .NET 8 SDK

## Install Dependencies

From the repository root:

```bash
npm install
```

## Configure Environment

Copy the API environment example:

```bash
cp apps/api/.env.example apps/api/.env
```

Then edit `apps/api/.env`.

Required values are documented in [ENV_SETUP.md](ENV_SETUP.md).

## Generate Development Keys

```bash
npm run generate:all
```

This creates local JWT and RSA key files in ignored folders:

```text
jwt-keys/
rsa-keys/
```

Copy the generated values into `apps/api/.env`.

## Database Setup

Use either local PostgreSQL or Supabase PostgreSQL.

Example local connection:

```env
DATABASE_URL=postgresql://project_x:password@localhost:5432/project_x
```

Validate Prisma:

```bash
npm run db:validate
```

Generate Prisma client:

```bash
npm run db:generate
```

Run development migrations:

```bash
npm run db:migrate
```

## Build And Run

Build the API:

```bash
npm run build:api
```

Start the API in watch mode:

```bash
npm run dev:api
```

Health check:

```bash
curl http://localhost:4000/api/v1/health
```

Expected response:

```json
{
  "data": {
    "status": "ok"
  }
}
```

## Common Commands

```bash
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:studio
npm run build:api
npm run dev:api
npm run check
```

## Desktop Notes

The desktop client is planned as WPF .NET 8 MVVM. Current desktop code contains licensing and offline validation pieces only. Full WPF app shell and project build wiring are not complete yet.

## Troubleshooting

Database connection failed:

- Confirm PostgreSQL is running.
- Confirm `DATABASE_URL` is set in `apps/api/.env`.
- Confirm the database exists.

Prisma client missing:

```bash
npm run db:generate
```

Port 4000 already in use on Windows:

```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```


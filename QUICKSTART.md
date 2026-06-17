# Quick Start Guide

**Get Project X up and running in 5 minutes.**

## 1️⃣ Install Dependencies

```bash
npm install
```

## 2️⃣ Setup Database

```bash
# Copy environment template
cp apps/api/.env.example apps/api/.env

# Edit .env with PostgreSQL connection
# DATABASE_URL=postgresql://project_x:password@localhost:5432/project_x
```

Create PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE project_x;
CREATE USER project_x WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE project_x TO project_x;
\q
```

## 3️⃣ Generate Security Keys

```bash
npm run generate:all
```

Copy the output into your `.env` file:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `LICENSE_PRIVATE_KEY_PEM_BASE64`
- `LICENSE_PUBLIC_KEY_PEM`

## 4️⃣ Initialize Database

```bash
npm run db:migrate
npm run db:generate
```

## 5️⃣ Start Development Server

```bash
npm run dev:api
```

🎉 **API running at** `http://localhost:4000`

## Test the Setup

```bash
# Health check
curl http://localhost:4000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-14T12:00:00.000Z"
}
```

## Common Commands

```bash
# Development
npm run dev:api              # Start API with hot-reload
npm run db:studio           # Open Prisma Studio

# Database
npm run db:migrate          # Run pending migrations
npm run db:generate         # Generate Prisma client
npm run db:validate         # Validate schema

# Code Quality
npm run lint                # Run linter
npm run test                # Run tests
npm run test:watch          # Run tests in watch mode

# Security Keys
npm run generate:jwt        # Generate JWT secrets
npm run generate:rsa        # Generate RSA key pair
npm run generate:all        # Generate all keys

# Building
npm run build:api           # Build for production
npm run start:api           # Start production server
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (local only, not committed) |
| `package.json` | Root workspace config & scripts |
| `README.md` | Project overview |
| `SETUP.md` | Detailed setup instructions |
| `ENV_SETUP.md` | Environment & key generation guide |

## Need Help?

- **Setup Issues**: See [SETUP.md](SETUP.md)
- **Environment Variables**: See [ENV_SETUP.md](ENV_SETUP.md)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **API Architecture**: See [docs/architecture/api-architecture.md](docs/architecture/api-architecture.md)

## Next Steps

1. ✅ Setup complete
2. 📚 Read [SETUP.md](SETUP.md) for detailed guide
3. 🏗️ Check [docs/architecture/](docs/architecture/) to understand the system
4. 🚀 Start building features!

---

**Questions?** Check the main [README.md](README.md) or create an issue.

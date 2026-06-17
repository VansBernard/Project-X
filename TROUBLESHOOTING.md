# Troubleshooting Guide

Common issues and their solutions.

## Setup Issues

### npm install fails

**Error**: `npm ERR! code ERESOLVE`

**Solution**:
```bash
# Use legacy peer deps flag
npm install --legacy-peer-deps

# Or update npm
npm install -g npm@latest
npm install
```

### PostgreSQL Connection Error

**Error**: `Can't reach database server at 'localhost:5432'`

**Solution**:
```bash
# Check if PostgreSQL is running
psql -U postgres

# If not installed, install PostgreSQL from postgresql.org
# macOS: brew install postgresql
# Windows: Download from postgresql.org
# Linux: sudo apt install postgresql
```

### Database doesn't exist

**Error**: `ECONNREFUSED` or `database "project_x" does not exist`

**Solution**:
```bash
# Create database and user
psql -U postgres
CREATE DATABASE project_x;
CREATE USER project_x WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE project_x TO project_x;
\q

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://project_x:password@localhost:5432/project_x
```

## Environment & Keys

### Missing JWT_ACCESS_SECRET

**Error**: `Error: JWT_ACCESS_SECRET must be at least 32 characters`

**Solution**:
```bash
# Generate new JWT secrets
npm run generate:jwt

# Copy output to .env
# JWT_ACCESS_SECRET=...
# JWT_REFRESH_SECRET=...
```

### RSA Key Generation Hanging

**Issue**: `npm run generate:rsa` takes too long or seems stuck

**Solution**:
```bash
# RSA-4096 generation takes 30-60 seconds
# Let it complete, do not interrupt

# If timeout, try again:
npm run generate:rsa

# Check system resources (CPU should be busy)
top  # macOS/Linux
tasklist  # Windows
```

### Invalid Base64 in LICENSE_PRIVATE_KEY_PEM_BASE64

**Error**: `Invalid private key: unable to decode`

**Solution**:
```bash
# Regenerate RSA keys
npm run generate:rsa

# Copy EXACTLY as shown (no modifications)
# Include the entire base64 string

# Verify no line breaks in .env
# Correct:
LICENSE_PRIVATE_KEY_PEM_BASE64=MIIEvQIBADANBgkqhkiG...

# Wrong: (with line breaks)
LICENSE_PRIVATE_KEY_PEM_BASE64=MIIEvQIBADANBgkqhkiG
9w0BAQE...
```

## Development Server

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::4000`

**Solution**:
```bash
# Kill process on port 4000
# macOS/Linux:
lsof -ti:4000 | xargs kill -9

# Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Or use different port
PORT=5000 npm run dev:api
```

### API Won't Start

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
cd apps/api
npm install
npx prisma generate
cd ../..
npm run dev:api
```

### Hot Reload Not Working

**Issue**: Changes don't appear when saving files

**Solution**:
```bash
# Make sure you're using dev command
npm run dev:api

# Not the build/start commands
# Check file is in src/ directory
# Not in dist/

# Restart the server
# Ctrl+C then npm run dev:api
```

## Database Issues

### Prisma Migrations Failed

**Error**: `Error: Unable to apply migration` 

**Solution**:
```bash
# Check migration status
cd apps/api
npx prisma migrate status

# Try migrate again
npx prisma migrate deploy

# If stuck, reset (⚠️ deletes data)
npx prisma migrate reset
```

### Prisma Client Out of Sync

**Error**: `Error: The provided database string is invalid`

**Solution**:
```bash
# Regenerate Prisma client
cd apps/api
npx prisma generate

# Clear cache
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

### Database Query Errors in Code

**Error**: Properties don't match on Prisma queries

**Solution**:
```bash
# Regenerate Prisma after schema changes
cd apps/api
npx prisma generate

# Verify schema is correct
npx prisma validate

# Check schema file
nano prisma/schema.prisma
```

## Testing Issues

### Tests Fail Locally But Pass in CI

**Issue**: Inconsistent test results

**Solution**:
```bash
# Clear everything
npm run clean

# Reinstall
npm install

# Regenerate
npx prisma generate

# Run tests
npm run test
```

### Database Locked During Tests

**Error**: `Error: database is locked`

**Solution**:
```bash
# Multiple test runners using same database
# Run tests serially instead of parallel

# Update test config to run one at a time
npm run test -- --runInBand
```

### Module Not Found in Tests

**Error**: `Cannot find module '@/lib/...'`

**Solution**:
```bash
# Check path aliases in tsconfig.json
cat apps/api/tsconfig.json

# Expected to have:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Reinstall and regenerate
npm install
npx tsc
```

## Deployment Issues

### Environment Variables Not Loading

**Error**: `Error: NODE_ENV is not set` (in production)

**Solution**:
- Set environment variables in deployment platform dashboard
- Not in `.env` file (never deployed)
- Render: Environment tab
- Railway: Variables section
- Heroku: `heroku config:set VAR=value`

### Database Migrations Not Running

**Error**: `Error: relation "user" does not exist` (in production)

**Solution**:
```bash
# Add migration to startup process

# Render: Add release command
Release Command: cd apps/api && npx prisma migrate deploy

# Railway: Add to build.entrypoint
build:
  buildCommand: "npm install && npx prisma migrate deploy"

# Heroku: Add to Procfile
release: cd apps/api && npx prisma migrate deploy
```

### Logs Not Showing

**Issue**: Can't see application logs in production

**Solution**:
- Render: Logs tab shows real-time output
- Railway: Logs visible in dashboard
- Heroku: `heroku logs --tail`
- AWS: CloudWatch Logs
- Check application is logging to stdout/stderr

## Performance Issues

### Slow Database Queries

**Solution**:
```typescript
// Add query logging
import { QueryEvent } from "@prisma/client/runtime/library";

prisma.$on("query", (e: QueryEvent) => {
  console.log("Duration: " + e.duration + "ms");
  console.log("Query: " + e.query);
});
```

### High Memory Usage

**Solution**:
```bash
# Increase Node.js heap
NODE_OPTIONS="--max-old-space-size=2048" npm run dev:api

# Check what's using memory
node --prof app.js
node --prof-process isolate-*.log > profile.txt
```

### Slow Startup

**Solution**:
```bash
# Check what's taking time
node --prof src/server.ts
# Run for a bit then Ctrl+C
node --prof-process isolate-*.log > profile.txt

# Or time startup
time npm run dev:api
```

## Git Issues

### Merge Conflicts in package-lock.json

**Solution**:
```bash
# Resolve conflicts
npm install

# Let npm regenerate lock file
git add package-lock.json
git commit -m "resolve package-lock conflicts"
```

### Large File Committed

**Error**: `fatal: The remote end hung up unexpectedly`

**Solution**:
```bash
# Don't commit node_modules or build artifacts
# Already in .gitignore, but check:
cat .gitignore

# If accidentally committed:
git rm --cached node_modules/
git commit -m "remove node_modules"
```

## Still Stuck?

1. **Check Logs**: Look at full error message and stack trace
2. **Search Existing Issues**: GitHub issues might have your problem
3. **Read Documentation**: Check SETUP.md and ENV_SETUP.md
4. **Ask for Help**: Create an issue with error details
5. **Clear Everything**: Sometimes `npm run clean` and restart helps

---

**Last Updated**: June 2026

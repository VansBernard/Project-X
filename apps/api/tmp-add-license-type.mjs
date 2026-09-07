import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const stmts = [
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_type') THEN CREATE TYPE license_type AS ENUM ('temporary','permanent'); END IF; END$$;",
    "ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_type license_type NOT NULL DEFAULT 'temporary';",
    "CREATE INDEX IF NOT EXISTS licenses_dealer_id_license_type_idx ON licenses(dealer_id, license_type);"
  ];

  for (const s of stmts) {
    console.log('Executing:', s.replace(/\n/g, ' '));
    try {
      await prisma.$executeRawUnsafe(s);
    } catch (err) {
      console.error('Failed:', err.message || err);
      throw err;
    }
  }

  console.log('license_type enum and column added.');
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

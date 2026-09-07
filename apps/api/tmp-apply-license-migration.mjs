import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const prisma = new PrismaClient();
const migrationPath = path.resolve(__dirname, 'prisma', 'migrations', '202606150007_license_engine', 'migration.sql');

async function main() {
  const sql = await fs.readFile(migrationPath, 'utf8');
  console.log('Applying migration SQL from', migrationPath);
  await prisma.$connect();
  // Split by semicolon to run statements individually to avoid multi-statement issues
  const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    console.log('Executing statement snippet:', stmt.slice(0, 120).replace(/\n/g, ' '));
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err) {
      console.error('Statement failed:', err.message || err);
      throw err;
    }
  }
  console.log('Migration applied.');
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

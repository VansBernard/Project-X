import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL!.replace('aws-1-eu-west-2.pooler.supabase.com:6543', 'db.klsqjkgxvwvxasmbqbjq.supabase.co:5432');
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();
  console.log('CONNECTED');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

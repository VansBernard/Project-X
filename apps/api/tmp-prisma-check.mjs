import { env } from './dist/config/env.js';
import { PrismaClient } from '@prisma/client';
import { prismaDatabaseUrl } from './dist/lib/database-url.js';

console.log('env DATABASE_URL:', env.DATABASE_URL);
console.log('prismaDatabaseUrl():', prismaDatabaseUrl());

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prismaDatabaseUrl()
    }
  }
});

try {
  await prisma.$connect();
  console.log('Prisma connected successfully');
} catch (error) {
  console.error('Prisma connection error:', error instanceof Error ? error.message : error);
  console.error('Full error:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

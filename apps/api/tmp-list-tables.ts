import { PrismaClient } from '@prisma/client';
import { prismaDatabaseUrl } from './src/lib/database-url';
import { env } from './src/config/env';

const prisma = new PrismaClient({
  datasources: {
    db: { url: prismaDatabaseUrl() }
  }
});

try {
  const tables = await prisma.$queryRawUnsafe(`select tablename from pg_tables where schemaname='public' order by tablename`);
  console.log('tables:', JSON.stringify(tables, null, 2));
} catch (error) {
  console.error('query error:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

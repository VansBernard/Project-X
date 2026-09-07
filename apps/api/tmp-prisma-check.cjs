const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL || 'postgresql://postgres.klsqjkgxvwvxasmbqbjq:%2CFry5af_%40q5%2B%242U@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true' }
  }
});

prisma.$queryRaw`SELECT 1`
  .then(() => {
    console.log('ok');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

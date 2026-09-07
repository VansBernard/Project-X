import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'licenses' AND column_name = 'license_type';"
  );
  console.log(JSON.stringify(rows, null, 2));
} catch (error) {
  console.error('CHECK_ERROR', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

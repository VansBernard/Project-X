import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const deviceId = 'eb4c3e55-5d0e-4276-8225-8ed7935d1286';

async function main() {
  const cols = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='licenses' ORDER BY ordinal_position`;
  console.log('licenses columns:', cols);

  const rows = await prisma.$queryRaw`SELECT * FROM licenses WHERE device_id = CAST(${deviceId} AS uuid) ORDER BY created_at DESC LIMIT 10`;
  console.log('licenses rows:', rows);
}

main().catch(err => { console.error(err); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

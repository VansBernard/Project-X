import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const deviceId = 'eb4c3e55-5d0e-4276-8225-8ed7935d1286';

async function main() {
  const licenses = await prisma.license.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('Licenses for device', deviceId);
  console.log(licenses.map(l => ({ id: l.id, licenseKey: l.licenseKey, licenseType: l.licenseType, status: l.status, issuedAt: l.issuedAt, expiresAt: l.expiresAt })));
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

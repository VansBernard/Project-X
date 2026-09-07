import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(devices.map((d) => ({
    id: d.id,
    serialNumber: d.serialNumber,
    dealerId: d.dealerId,
    customerId: d.customerId,
    status: d.status,
    createdAt: d.createdAt,
    deletedAt: d.deletedAt,
  })));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

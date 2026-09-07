import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { contracts: { orderBy: { createdAt: 'desc' }, take: 1 } }
  });

  console.log('Recent devices:');
  for (const device of devices) {
    const c = (device.contracts && device.contracts.length) ? device.contracts[0] : null;
    console.log({
      id: device.id,
      serialNumber: device.serialNumber,
      customerId: device.customerId,
      status: device.status,
      contractId: c?.id ?? null,
      contractNumber: c?.contractNumber ?? null,
      contractDeviceId: c?.deviceId ?? null,
      createdAt: device.createdAt,
      deletedAt: device.deletedAt,
    });
  }

  const contracts = await prisma.contract.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { device: true, customer: true }
  });
  console.log('\nRecent contracts:');
  for (const contract of contracts) {
    console.log({
      id: contract.id,
      contractNumber: contract.contractNumber,
      deviceId: contract.deviceId,
      deviceSerial: contract.device?.serialNumber,
      customerId: contract.customerId,
      customerName: contract.customer?.fullName,
      status: contract.status,
      createdAt: contract.createdAt,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

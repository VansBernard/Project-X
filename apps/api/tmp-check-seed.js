import { prisma } from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@test.com' },
    select: { id: true, email: true, passwordHash: true, dealerId: true, status: true, deletedAt: true }
  });

  const dealer = await prisma.dealer.findFirst({
    where: { slug: 'test-dealer' },
    select: { id: true, slug: true, status: true, deletedAt: true }
  });

  console.log({ user, dealer });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

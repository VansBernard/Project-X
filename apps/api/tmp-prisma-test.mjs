import { prisma } from './src/lib/prisma.ts';

const values = ['127.0.0.1', '::1', '::ffff:127.0.0.1', undefined];

for (const value of values) {
  try {
    const result = await prisma.session.create({
      data: {
        dealerId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000000',
        refreshTokenHash: 'test',
        expiresAt: new Date(Date.now() + 1000),
        ipAddress: value
      }
    });
    console.log('ok', value, result.id);
    await prisma.session.deleteMany({ where: { id: result.id } });
  } catch (e) {
    console.log('err', value, e instanceof Error ? e.message : e);
  }
}

await prisma.$disconnect();

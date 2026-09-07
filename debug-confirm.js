import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { dealerManagementService } from './apps/api/src/modules/dealers/dealer-management.service.ts';

const prisma = new PrismaClient();

const token = crypto.randomBytes(32).toString('base64url');
const email = 'debug-' + Date.now() + '@example.com';
const slug = 'debug-' + Date.now();

const payload = {
  input: {
    dealer: {
      name: 'Debug Dealer',
      slug,
      email: 'owner@example.com',
      country: 'NG',
      timezone: 'UTC',
      metadata: {}
    },
    owner: {
      email,
      password: 'Password123!',
      firstName: 'Debug',
      lastName: 'Tester',
      phone: '+2348000000000'
    }
  },
  passwordHash: 'fakehash'
};

const hash = crypto.createHash('sha256').update(token).digest('hex');

try {
  await prisma.pendingDealerSignup.create({
    data: {
      email,
      slug,
      payload,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      confirmedAt: null
    }
  });

  console.log('TOKEN=', token);
  console.log('HASH=', hash);

  const pending = await prisma.pendingDealerSignup.findFirst({ where: { tokenHash: hash } });
  console.log('FOUND=', !!pending, pending ? pending.email : null);

  const result = await dealerManagementService.confirmSignup(token);
  console.log('RESULT=', JSON.stringify(result));
} catch (error) {
  console.error('ERROR=', error instanceof Error ? error.message : String(error));
  console.error('STACK=', error instanceof Error ? error.stack : error);
} finally {
  await prisma.pendingDealerSignup.deleteMany({ where: { email } });
  await prisma.$disconnect();
}

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { prisma } from './src/lib/prisma.ts';

try {
  await prisma.$connect();
  console.log('CONNECTED');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

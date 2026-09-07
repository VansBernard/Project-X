import { prisma } from './src/lib/prisma.js';

async function testConnection() {
  try {
    console.log('Testing Prisma connection...');
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ Database connection successful');
    console.log('Query result:', result);

    // Test if dealers table exists
    const dealers = await prisma.dealer.findMany({ take: 1 });
    console.log('✓ Dealers table accessible');
    console.log('Found dealers:', dealers.length);

    // Test user count
    const users = await prisma.user.findMany({ take: 1 });
    console.log('✓ Users table accessible');
    console.log('Found users:', users.length);

  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

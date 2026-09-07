import { PrismaClient } from '@prisma/client';
import { prismaDatabaseUrl } from './src/lib/database-url.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prismaDatabaseUrl()
    }
  }
});

async function createEnumAndStatusColumn() {
  try {
    console.log('Creating dealer_status enum type...');
    await prisma.$executeRawUnsafe(`
      CREATE TYPE IF NOT EXISTS dealer_status AS ENUM ('active', 'suspended', 'deleted');
    `);
    console.log('✓ dealer_status enum created');

    console.log('\nAdding status column to dealers table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE dealers ADD COLUMN IF NOT EXISTS status dealer_status NOT NULL DEFAULT 'active';
    `);
    console.log('✓ status column added');

    console.log('\n✓ All done!');
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

createEnumAndStatusColumn();

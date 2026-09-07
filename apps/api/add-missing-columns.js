import { PrismaClient } from '@prisma/client';
import { prismaDatabaseUrl } from './src/lib/database-url.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prismaDatabaseUrl()
    }
  }
});

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to dealers table...');
    
    // Add missing columns one by one
    const columns = [
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS status dealer_status NOT NULL DEFAULT \'active\';',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS suspended_at timestamptz;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS suspended_reason text;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS paystack_subaccount_code text;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS paystack_subaccount_id text;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS paystack_subaccount_status text;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS paystack_subaccount_updated_at timestamptz;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS payout_method text;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS paystack_transfer_recipient_code text;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS paystack_transfer_recipient_status text;',
      'ALTER TABLE dealers ADD COLUMN IF NOT EXISTS paystack_transfer_recipient_updated_at timestamptz;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;'
    ];

    for (const sql of columns) {
      try {
        console.log(`Executing: ${sql.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(sql);
        console.log('✓ Success');
      } catch (error) {
        console.error(`✗ Error: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log('\n✓ All column additions attempted');
    
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();

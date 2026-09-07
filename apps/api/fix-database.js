import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

async function fixDatabase() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create enum type
    console.log('Creating dealer_status enum...');
    try {
      await client.query(`CREATE TYPE IF NOT EXISTS dealer_status AS ENUM ('active', 'suspended', 'deleted');`);
      console.log('✓ Enum created');
    } catch (e) {
      console.log('Enum already exists or error:', e.message);
    }

    // Add status column
    console.log('Adding status column...');
    try {
      await client.query(`ALTER TABLE dealers ADD COLUMN status dealer_status NOT NULL DEFAULT 'active';`);
      console.log('✓ Status column added');
    } catch (e) {
      console.log('Column already exists or error:', e.message);
    }

    console.log('\n✓ Database fix complete');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixDatabase();

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL is set; skipping local database creation.');
  process.exit(0);
}

const config = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: 'postgres'
};

async function ensureDatabase() {
  const client = new Client(config);
  try {
    await client.connect();

    const dbName = process.env.PGDATABASE || 'financing_app';

    const check = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (check.rowCount === 0) {
      console.log(`Database '${dbName}' not found — creating...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created`);
    } else {
      console.log(`Database '${dbName}' already exists`);
    }
  } catch (err) {
    console.error('Error ensuring database exists:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

ensureDatabase();

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env');
dotenv.config({ path: envPath });

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='licenses' ORDER BY ordinal_position");
  console.log('licenses columns:', cols.rows);

  const deviceId = 'eb4c3e55-5d0e-4276-8225-8ed7935d1286';
  const res = await client.query('SELECT * FROM licenses WHERE device_id = $1 ORDER BY created_at DESC LIMIT 10', [deviceId]);
  console.log('licenses rows:', res.rows);
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });

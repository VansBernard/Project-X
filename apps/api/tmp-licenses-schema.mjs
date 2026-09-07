import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pkg from 'pg';

const { Client } = pkg;
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env');
dotenv.config({ path: envPath });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='licenses' ORDER BY ordinal_position`);
  console.log(res.rows);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

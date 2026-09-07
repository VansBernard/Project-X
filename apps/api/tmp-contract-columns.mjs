import dotenv from 'dotenv';
import { Client } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.PGSSLMODE = 'no-verify';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('No DATABASE_URL set');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});
try {
  await client.connect();
  const res = await client.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name='contracts' order by ordinal_position;`
  );
  console.log(JSON.stringify(res.rows.map((r) => r.column_name), null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await client.end();
}

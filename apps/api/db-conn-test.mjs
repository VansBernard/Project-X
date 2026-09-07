import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();
const url = process.env.DATABASE_URL;
console.log('DATABASE_URL set:', !!url);
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const res = await client.query('SELECT 1 AS ok');
  console.log(res.rows);
} catch (err) {
  console.error('db-error', err);
  process.exit(1);
} finally {
  await client.end();
}

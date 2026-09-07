import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env" });

const connectionUrl = new URL(process.env.DATABASE_URL);
connectionUrl.searchParams.delete("sslmode");
connectionUrl.searchParams.delete("sslaccept");

const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz(6) NOT NULL DEFAULT now(),
      updated_at timestamptz(6) NOT NULL DEFAULT now()
    )
  `);
  await client.query("COMMIT");

  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'platform_settings'
  `);
  if (result.rowCount !== 1) throw new Error("platform_settings table was not created");
  console.log("Platform dashboard ads storage is ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env" });

const connectionUrl = new URL(process.env.DATABASE_URL);
// `pg` lets sslmode in the URL override explicit SSL options.
connectionUrl.searchParams.delete("sslmode");
connectionUrl.searchParams.delete("sslaccept");

const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(`
    ALTER TABLE public.customers
      ADD COLUMN IF NOT EXISTS full_name text,
      ADD COLUMN IF NOT EXISTS national_id text,
      ADD COLUMN IF NOT EXISTS emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb
  `);
  await client.query(`
    UPDATE public.customers
    SET full_name = trim(first_name || ' ' || last_name)
    WHERE full_name IS NULL
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS customers_dealer_id_national_id_key
      ON public.customers(dealer_id, national_id)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS customers_dealer_id_full_name_idx
      ON public.customers(dealer_id, full_name)
  `);
  await client.query("COMMIT");

  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name IN ('emergency_contact', 'full_name', 'national_id')
    ORDER BY column_name
  `);

  if (result.rowCount !== 3) {
    throw new Error("customer columns were not found after repair");
  }

  console.log("Customer-management columns are ready:", result.rows);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

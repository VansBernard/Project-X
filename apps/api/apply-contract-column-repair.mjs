import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const statements = [
  `DO $$ BEGIN
     CREATE TYPE contract_installment_status AS ENUM ('pending', 'completed', 'defaulted', 'cancelled');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`,
  `ALTER TABLE contracts
     ADD COLUMN IF NOT EXISTS device_price numeric(14, 2),
     ADD COLUMN IF NOT EXISTS deposit_amount numeric(14, 2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS remaining_balance numeric(14, 2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS installment_amount numeric(14, 2),
     ADD COLUMN IF NOT EXISTS first_due_date date,
     ADD COLUMN IF NOT EXISTS next_due_date date`,
  `UPDATE contracts
     SET device_price = COALESCE(device_price, total_amount),
         remaining_balance = COALESCE(remaining_balance, GREATEST(total_amount - amount_paid, 0)),
         installment_amount = COALESCE(installment_amount, total_amount)`,
  `ALTER TABLE contracts
     ALTER COLUMN device_price SET NOT NULL,
     ALTER COLUMN installment_amount SET NOT NULL`,
  `CREATE TABLE IF NOT EXISTS contract_installments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
     contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
     sequence_number integer NOT NULL,
     due_date date NOT NULL,
     amount_due numeric(14, 2) NOT NULL,
     status contract_installment_status NOT NULL DEFAULT 'pending',
     metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     deleted_at timestamptz,
     CONSTRAINT contract_installments_amount_due_positive CHECK (amount_due > 0),
     CONSTRAINT contract_installments_sequence_positive CHECK (sequence_number > 0),
     CONSTRAINT contract_installments_dealer_id_contract_id_sequence_number_key UNIQUE (dealer_id, contract_id, sequence_number),
     CONSTRAINT contract_installments_dealer_id_id_key UNIQUE (dealer_id, id)
   )`,
  `CREATE INDEX IF NOT EXISTS contract_installments_dealer_id_contract_id_idx
     ON contract_installments(dealer_id, contract_id)`,
  `CREATE INDEX IF NOT EXISTS contract_installments_dealer_id_due_date_idx
     ON contract_installments(dealer_id, due_date)`,
  `CREATE INDEX IF NOT EXISTS contract_installments_dealer_id_status_idx
     ON contract_installments(dealer_id, status)`,
  `CREATE INDEX IF NOT EXISTS contract_installments_dealer_id_deleted_at_idx
     ON contract_installments(dealer_id, deleted_at)`
];

try {
  await client.connect();
  await client.query('BEGIN');
  for (const statement of statements) await client.query(statement);
  await client.query('COMMIT');
  console.log('Contract financing columns synchronized.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}

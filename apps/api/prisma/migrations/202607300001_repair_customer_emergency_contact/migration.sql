-- Repair databases where the original customer-management migration was
-- recorded without creating all of its customer fields.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE customers
SET full_name = trim(first_name || ' ' || last_name)
WHERE full_name IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_dealer_id_national_id_key
  ON customers(dealer_id, national_id);
CREATE INDEX IF NOT EXISTS customers_dealer_id_full_name_idx
  ON customers(dealer_id, full_name);

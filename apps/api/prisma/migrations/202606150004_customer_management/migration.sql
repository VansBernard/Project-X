ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE customers
SET full_name = trim(first_name || ' ' || last_name)
WHERE full_name IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_dealer_id_national_id_key ON customers(dealer_id, national_id);
CREATE INDEX IF NOT EXISTS customers_dealer_id_full_name_idx ON customers(dealer_id, full_name);

INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, permission_key, permission_name, permission_description
FROM dealers d
CROSS JOIN (
  VALUES
    ('customers:history:read', 'Read Customer History', 'View customer contract, payment, and device history')
) AS p(permission_key, permission_name, permission_description)
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE r.name IN ('Super Admin', 'Dealer', 'Sales Agent')
  AND p.key = 'customers:history:read'
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;

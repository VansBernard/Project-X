CREATE TYPE contract_installment_status AS ENUM ('pending', 'completed', 'defaulted', 'cancelled');

ALTER TYPE contract_status RENAME TO contract_status_old;
CREATE TYPE contract_status AS ENUM ('active', 'completed', 'defaulted', 'cancelled');

ALTER TABLE contracts
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE contract_status USING (
    CASE
      WHEN status::text IN ('completed', 'cancelled', 'defaulted') THEN status::text
      ELSE 'active'
    END
  )::contract_status,
  ALTER COLUMN status SET DEFAULT 'active';

DROP TYPE contract_status_old;

ALTER TABLE contracts
  ADD COLUMN device_price numeric(14, 2),
  ADD COLUMN deposit_amount numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN remaining_balance numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN installment_amount numeric(14, 2),
  ADD COLUMN first_due_date date,
  ADD COLUMN next_due_date date;

UPDATE contracts
SET
  device_price = total_amount,
  remaining_balance = GREATEST(total_amount - amount_paid, 0),
  installment_amount = total_amount;

ALTER TABLE contracts
  ALTER COLUMN device_price SET NOT NULL,
  ALTER COLUMN installment_amount SET NOT NULL;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_financing_amounts_valid CHECK (
    device_price >= 0
    AND deposit_amount >= 0
    AND remaining_balance >= 0
    AND installment_amount > 0
    AND deposit_amount <= device_price
  );

CREATE TABLE contract_installments (
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
  CONSTRAINT contract_installments_sequence_positive CHECK (sequence_number > 0)
);

CREATE UNIQUE INDEX contract_installments_dealer_id_contract_id_sequence_number_key
  ON contract_installments(dealer_id, contract_id, sequence_number);
CREATE UNIQUE INDEX contract_installments_dealer_id_id_key
  ON contract_installments(dealer_id, id);
CREATE INDEX contract_installments_dealer_id_contract_id_idx
  ON contract_installments(dealer_id, contract_id);
CREATE INDEX contract_installments_dealer_id_due_date_idx
  ON contract_installments(dealer_id, due_date);
CREATE INDEX contract_installments_dealer_id_status_idx
  ON contract_installments(dealer_id, status);
CREATE INDEX contract_installments_dealer_id_deleted_at_idx
  ON contract_installments(dealer_id, deleted_at);
CREATE INDEX contracts_dealer_id_next_due_date_idx
  ON contracts(dealer_id, next_due_date);

CREATE TRIGGER contract_installments_set_updated_at
BEFORE UPDATE ON contract_installments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE contract_installments
  ADD CONSTRAINT contract_installments_dealer_contract_fk
  FOREIGN KEY (dealer_id, contract_id) REFERENCES contracts(dealer_id, id) ON DELETE CASCADE;

INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, permission_key, permission_name, permission_description
FROM dealers d
CROSS JOIN (
  VALUES
    ('contracts:read', 'Read Contracts', 'View dealer contracts and schedules'),
    ('contracts:manage', 'Manage Contracts', 'Create and update dealer contracts'),
    ('contracts:status', 'Update Contract Status', 'Change contract lifecycle status')
) AS p(permission_key, permission_name, permission_description)
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE
  (r.name = 'Super Admin' AND p.key IN ('contracts:read', 'contracts:manage', 'contracts:status'))
  OR (r.name = 'Dealer' AND p.key IN ('contracts:read', 'contracts:manage', 'contracts:status'))
  OR (r.name = 'Sales Agent' AND p.key IN ('contracts:read'))
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;


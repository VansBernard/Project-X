CREATE TYPE license_delivery_status AS ENUM ('queued', 'processing', 'sent', 'retrying', 'failed');

CREATE TABLE license_delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  license_id uuid REFERENCES licenses(id) ON DELETE SET NULL,
  status license_delivery_status NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT license_delivery_jobs_attempts_non_negative CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX license_delivery_jobs_payment_id_key ON license_delivery_jobs(payment_id);
CREATE INDEX license_delivery_jobs_dealer_id_status_idx ON license_delivery_jobs(dealer_id, status);
CREATE INDEX license_delivery_jobs_dealer_id_next_retry_at_idx ON license_delivery_jobs(dealer_id, next_retry_at);
CREATE INDEX license_delivery_jobs_dealer_id_license_id_idx ON license_delivery_jobs(dealer_id, license_id);
CREATE INDEX license_delivery_jobs_dealer_id_deleted_at_idx ON license_delivery_jobs(dealer_id, deleted_at);

CREATE TRIGGER license_delivery_jobs_set_updated_at
BEFORE UPDATE ON license_delivery_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, permission_key, permission_name, permission_description
FROM dealers d
CROSS JOIN (
  VALUES
    ('licenses:deliver', 'Deliver Licenses', 'Send signed licenses to customer email'),
    ('licenses:delivery:retry', 'Retry License Delivery', 'Retry failed license delivery jobs')
) AS p(permission_key, permission_name, permission_description)
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE
  (r.name = 'Super Admin' AND p.key IN ('licenses:deliver', 'licenses:delivery:retry'))
  OR (r.name = 'Dealer' AND p.key IN ('licenses:deliver', 'licenses:delivery:retry'))
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;

CREATE TYPE payment_attempt_type AS ENUM ('initialization', 'validation', 'webhook_processing', 'retry');
CREATE TYPE payment_attempt_status AS ENUM ('pending', 'successful', 'failed');
CREATE TYPE payment_webhook_status AS ENUM ('received', 'processed', 'ignored', 'failed');

CREATE TABLE payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  type payment_attempt_type NOT NULL,
  status payment_attempt_status NOT NULL DEFAULT 'pending',
  provider payment_provider NOT NULL DEFAULT 'paystack',
  provider_reference text,
  attempt_number integer NOT NULL DEFAULT 1,
  request_payload jsonb,
  response_payload jsonb,
  error_code text,
  error_message text,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT payment_attempts_attempt_number_positive CHECK (attempt_number > 0)
);

CREATE TABLE payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES dealers(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  provider payment_provider NOT NULL DEFAULT 'paystack',
  event text NOT NULL,
  provider_event_id text,
  provider_reference text,
  signature text,
  payload jsonb NOT NULL,
  status payment_webhook_status NOT NULL DEFAULT 'received',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX payment_attempts_dealer_id_payment_id_idx ON payment_attempts(dealer_id, payment_id);
CREATE INDEX payment_attempts_dealer_id_provider_reference_idx ON payment_attempts(dealer_id, provider_reference);
CREATE INDEX payment_attempts_dealer_id_type_status_idx ON payment_attempts(dealer_id, type, status);
CREATE INDEX payment_attempts_dealer_id_next_retry_at_idx ON payment_attempts(dealer_id, next_retry_at);
CREATE INDEX payment_attempts_dealer_id_deleted_at_idx ON payment_attempts(dealer_id, deleted_at);

CREATE UNIQUE INDEX payment_webhook_events_provider_provider_event_id_key
  ON payment_webhook_events(provider, provider_event_id);
CREATE INDEX payment_webhook_events_dealer_id_payment_id_idx
  ON payment_webhook_events(dealer_id, payment_id);
CREATE INDEX payment_webhook_events_provider_provider_reference_idx
  ON payment_webhook_events(provider, provider_reference);
CREATE INDEX payment_webhook_events_provider_event_idx
  ON payment_webhook_events(provider, event);
CREATE INDEX payment_webhook_events_status_idx
  ON payment_webhook_events(status);
CREATE INDEX payment_webhook_events_processed_at_idx
  ON payment_webhook_events(processed_at);
CREATE INDEX payment_webhook_events_deleted_at_idx
  ON payment_webhook_events(deleted_at);

CREATE TRIGGER payment_attempts_set_updated_at
BEFORE UPDATE ON payment_attempts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payment_webhook_events_set_updated_at
BEFORE UPDATE ON payment_webhook_events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, permission_key, permission_name, permission_description
FROM dealers d
CROSS JOIN (
  VALUES
    ('payments:initialize', 'Initialize Payments', 'Initialize Paystack payment sessions'),
    ('payments:validate', 'Validate Payments', 'Validate Paystack references without trusting frontend callbacks')
) AS p(permission_key, permission_name, permission_description)
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE
  (r.name = 'Super Admin' AND p.key IN ('payments:initialize', 'payments:validate'))
  OR (r.name = 'Dealer' AND p.key IN ('payments:initialize', 'payments:validate'))
  OR (r.name = 'Sales Agent' AND p.key IN ('payments:initialize', 'payments:validate'))
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;

CREATE TYPE device_recovery_authorization_status AS ENUM ('issued', 'used', 'expired', 'revoked', 'rejected');

CREATE TABLE device_recovery_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  challenge text NOT NULL,
  status device_recovery_authorization_status NOT NULL DEFAULT 'issued',
  issued_at timestamptz(6) NOT NULL DEFAULT now(),
  expires_at timestamptz(6) NOT NULL,
  used_at timestamptz(6),
  revoked_at timestamptz(6),
  signed_payload jsonb NOT NULL,
  signature text NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX device_recovery_authorizations_dealer_id_id_key
  ON device_recovery_authorizations(dealer_id, id);
CREATE UNIQUE INDEX device_recovery_authorizations_dealer_id_challenge_key
  ON device_recovery_authorizations(dealer_id, challenge);
CREATE INDEX device_recovery_authorizations_dealer_id_device_id_status_idx
  ON device_recovery_authorizations(dealer_id, device_id, status);
CREATE INDEX device_recovery_authorizations_dealer_id_expires_at_idx
  ON device_recovery_authorizations(dealer_id, expires_at);

CREATE TRIGGER device_recovery_authorizations_set_updated_at
BEFORE UPDATE ON device_recovery_authorizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

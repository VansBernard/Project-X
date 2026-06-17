CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_status AS ENUM ('invited', 'active', 'suspended', 'disabled');
CREATE TYPE customer_status AS ENUM ('prospect', 'active', 'delinquent', 'completed', 'blocked', 'archived');
CREATE TYPE device_status AS ENUM ('inventory', 'assigned', 'active', 'locked', 'released', 'lost', 'retired');
CREATE TYPE contract_status AS ENUM ('draft', 'active', 'overdue', 'completed', 'cancelled', 'defaulted');
CREATE TYPE payment_status AS ENUM ('pending', 'successful', 'failed', 'reversed', 'refunded');
CREATE TYPE payment_provider AS ENUM ('paystack');
CREATE TYPE license_status AS ENUM ('pending', 'active', 'suspended', 'expired', 'revoked');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed', 'cancelled');
CREATE TYPE audit_actor_type AS ENUM ('user', 'device', 'system', 'payment_provider');

CREATE TABLE dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  slug text NOT NULL,
  email text,
  phone text,
  country varchar(2),
  timezone text NOT NULL DEFAULT 'UTC',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  status user_status NOT NULL DEFAULT 'invited',
  last_login_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country varchar(2),
  status customer_status NOT NULL DEFAULT 'prospect',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  serial_number text NOT NULL,
  manufacturer text,
  model text,
  hardware_fingerprint text,
  status device_status NOT NULL DEFAULT 'inventory',
  last_seen_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  contract_number text NOT NULL,
  status contract_status NOT NULL DEFAULT 'draft',
  currency varchar(3) NOT NULL DEFAULT 'NGN',
  principal_amount numeric(14, 2) NOT NULL,
  total_amount numeric(14, 2) NOT NULL,
  amount_paid numeric(14, 2) NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT contracts_amounts_non_negative CHECK (
    principal_amount >= 0
    AND total_amount >= 0
    AND amount_paid >= 0
  )
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  provider payment_provider NOT NULL DEFAULT 'paystack',
  provider_reference text NOT NULL,
  provider_transaction text,
  status payment_status NOT NULL DEFAULT 'pending',
  currency varchar(3) NOT NULL DEFAULT 'NGN',
  amount numeric(14, 2) NOT NULL,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT payments_amount_non_negative CHECK (amount >= 0)
);

CREATE TABLE licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  license_key text NOT NULL,
  status license_status NOT NULL DEFAULT 'pending',
  issued_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'queued',
  recipient text NOT NULL,
  subject text,
  body text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  actor_type audit_actor_type NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX dealers_slug_key ON dealers(slug);
CREATE INDEX dealers_deleted_at_idx ON dealers(deleted_at);

CREATE UNIQUE INDEX roles_dealer_id_name_key ON roles(dealer_id, name);
CREATE UNIQUE INDEX roles_dealer_id_id_key ON roles(dealer_id, id);
CREATE INDEX roles_dealer_id_deleted_at_idx ON roles(dealer_id, deleted_at);

CREATE UNIQUE INDEX permissions_dealer_id_key_key ON permissions(dealer_id, key);
CREATE UNIQUE INDEX permissions_dealer_id_id_key ON permissions(dealer_id, id);
CREATE INDEX permissions_dealer_id_deleted_at_idx ON permissions(dealer_id, deleted_at);

CREATE UNIQUE INDEX users_dealer_id_email_key ON users(dealer_id, email);
CREATE UNIQUE INDEX users_dealer_id_id_key ON users(dealer_id, id);
CREATE INDEX users_dealer_id_status_idx ON users(dealer_id, status);
CREATE INDEX users_dealer_id_role_id_idx ON users(dealer_id, role_id);
CREATE INDEX users_dealer_id_deleted_at_idx ON users(dealer_id, deleted_at);

CREATE UNIQUE INDEX role_permissions_dealer_id_role_id_permission_id_key ON role_permissions(dealer_id, role_id, permission_id);
CREATE INDEX role_permissions_dealer_id_permission_id_idx ON role_permissions(dealer_id, permission_id);

CREATE INDEX customers_dealer_id_status_idx ON customers(dealer_id, status);
CREATE UNIQUE INDEX customers_dealer_id_id_key ON customers(dealer_id, id);
CREATE INDEX customers_dealer_id_email_idx ON customers(dealer_id, email);
CREATE INDEX customers_dealer_id_phone_idx ON customers(dealer_id, phone);
CREATE INDEX customers_dealer_id_deleted_at_idx ON customers(dealer_id, deleted_at);

CREATE UNIQUE INDEX devices_dealer_id_serial_number_key ON devices(dealer_id, serial_number);
CREATE UNIQUE INDEX devices_dealer_id_id_key ON devices(dealer_id, id);
CREATE INDEX devices_dealer_id_customer_id_idx ON devices(dealer_id, customer_id);
CREATE INDEX devices_dealer_id_status_idx ON devices(dealer_id, status);
CREATE INDEX devices_dealer_id_hardware_fingerprint_idx ON devices(dealer_id, hardware_fingerprint);
CREATE INDEX devices_dealer_id_last_seen_at_idx ON devices(dealer_id, last_seen_at);
CREATE INDEX devices_dealer_id_deleted_at_idx ON devices(dealer_id, deleted_at);

CREATE UNIQUE INDEX contracts_dealer_id_contract_number_key ON contracts(dealer_id, contract_number);
CREATE UNIQUE INDEX contracts_dealer_id_id_key ON contracts(dealer_id, id);
CREATE INDEX contracts_dealer_id_customer_id_idx ON contracts(dealer_id, customer_id);
CREATE INDEX contracts_dealer_id_device_id_idx ON contracts(dealer_id, device_id);
CREATE INDEX contracts_dealer_id_status_idx ON contracts(dealer_id, status);
CREATE INDEX contracts_dealer_id_start_date_idx ON contracts(dealer_id, start_date);
CREATE INDEX contracts_dealer_id_end_date_idx ON contracts(dealer_id, end_date);
CREATE INDEX contracts_dealer_id_deleted_at_idx ON contracts(dealer_id, deleted_at);

CREATE UNIQUE INDEX payments_provider_provider_reference_key ON payments(provider, provider_reference);
CREATE UNIQUE INDEX payments_dealer_id_id_key ON payments(dealer_id, id);
CREATE INDEX payments_dealer_id_customer_id_idx ON payments(dealer_id, customer_id);
CREATE INDEX payments_dealer_id_contract_id_idx ON payments(dealer_id, contract_id);
CREATE INDEX payments_dealer_id_status_idx ON payments(dealer_id, status);
CREATE INDEX payments_dealer_id_paid_at_idx ON payments(dealer_id, paid_at);
CREATE INDEX payments_dealer_id_deleted_at_idx ON payments(dealer_id, deleted_at);

CREATE UNIQUE INDEX licenses_dealer_id_license_key_key ON licenses(dealer_id, license_key);
CREATE UNIQUE INDEX licenses_dealer_id_id_key ON licenses(dealer_id, id);
CREATE INDEX licenses_dealer_id_customer_id_idx ON licenses(dealer_id, customer_id);
CREATE INDEX licenses_dealer_id_device_id_idx ON licenses(dealer_id, device_id);
CREATE INDEX licenses_dealer_id_contract_id_idx ON licenses(dealer_id, contract_id);
CREATE INDEX licenses_dealer_id_status_idx ON licenses(dealer_id, status);
CREATE INDEX licenses_dealer_id_expires_at_idx ON licenses(dealer_id, expires_at);
CREATE INDEX licenses_dealer_id_deleted_at_idx ON licenses(dealer_id, deleted_at);

CREATE INDEX notifications_dealer_id_customer_id_idx ON notifications(dealer_id, customer_id);
CREATE UNIQUE INDEX notifications_dealer_id_id_key ON notifications(dealer_id, id);
CREATE INDEX notifications_dealer_id_user_id_idx ON notifications(dealer_id, user_id);
CREATE INDEX notifications_dealer_id_status_idx ON notifications(dealer_id, status);
CREATE INDEX notifications_dealer_id_channel_idx ON notifications(dealer_id, channel);
CREATE INDEX notifications_dealer_id_scheduled_at_idx ON notifications(dealer_id, scheduled_at);
CREATE INDEX notifications_dealer_id_sent_at_idx ON notifications(dealer_id, sent_at);
CREATE INDEX notifications_dealer_id_deleted_at_idx ON notifications(dealer_id, deleted_at);

CREATE INDEX audit_logs_dealer_id_actor_user_id_idx ON audit_logs(dealer_id, actor_user_id);
CREATE UNIQUE INDEX audit_logs_dealer_id_id_key ON audit_logs(dealer_id, id);
CREATE INDEX audit_logs_dealer_id_customer_id_idx ON audit_logs(dealer_id, customer_id);
CREATE INDEX audit_logs_dealer_id_contract_id_idx ON audit_logs(dealer_id, contract_id);
CREATE INDEX audit_logs_dealer_id_device_id_idx ON audit_logs(dealer_id, device_id);
CREATE INDEX audit_logs_dealer_id_action_idx ON audit_logs(dealer_id, action);
CREATE INDEX audit_logs_dealer_id_entity_type_entity_id_idx ON audit_logs(dealer_id, entity_type, entity_id);
CREATE INDEX audit_logs_dealer_id_created_at_idx ON audit_logs(dealer_id, created_at);
CREATE INDEX audit_logs_dealer_id_deleted_at_idx ON audit_logs(dealer_id, deleted_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dealers_set_updated_at
BEFORE UPDATE ON dealers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER permissions_set_updated_at
BEFORE UPDATE ON permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER devices_set_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER contracts_set_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER licenses_set_updated_at
BEFORE UPDATE ON licenses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE users
  ADD CONSTRAINT users_dealer_role_fk
  FOREIGN KEY (dealer_id, role_id) REFERENCES roles(dealer_id, id) ON DELETE NO ACTION;

ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_dealer_role_fk
  FOREIGN KEY (dealer_id, role_id) REFERENCES roles(dealer_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT role_permissions_dealer_permission_fk
  FOREIGN KEY (dealer_id, permission_id) REFERENCES permissions(dealer_id, id) ON DELETE CASCADE;

ALTER TABLE devices
  ADD CONSTRAINT devices_dealer_customer_fk
  FOREIGN KEY (dealer_id, customer_id) REFERENCES customers(dealer_id, id) ON DELETE NO ACTION;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_dealer_customer_fk
  FOREIGN KEY (dealer_id, customer_id) REFERENCES customers(dealer_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT contracts_dealer_device_fk
  FOREIGN KEY (dealer_id, device_id) REFERENCES devices(dealer_id, id) ON DELETE NO ACTION;

ALTER TABLE payments
  ADD CONSTRAINT payments_dealer_customer_fk
  FOREIGN KEY (dealer_id, customer_id) REFERENCES customers(dealer_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT payments_dealer_contract_fk
  FOREIGN KEY (dealer_id, contract_id) REFERENCES contracts(dealer_id, id) ON DELETE NO ACTION;

ALTER TABLE licenses
  ADD CONSTRAINT licenses_dealer_customer_fk
  FOREIGN KEY (dealer_id, customer_id) REFERENCES customers(dealer_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT licenses_dealer_device_fk
  FOREIGN KEY (dealer_id, device_id) REFERENCES devices(dealer_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT licenses_dealer_contract_fk
  FOREIGN KEY (dealer_id, contract_id) REFERENCES contracts(dealer_id, id) ON DELETE NO ACTION;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_dealer_customer_fk
  FOREIGN KEY (dealer_id, customer_id) REFERENCES customers(dealer_id, id) ON DELETE NO ACTION,
  ADD CONSTRAINT notifications_dealer_user_fk
  FOREIGN KEY (dealer_id, user_id) REFERENCES users(dealer_id, id) ON DELETE NO ACTION;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_dealer_actor_user_fk
  FOREIGN KEY (dealer_id, actor_user_id) REFERENCES users(dealer_id, id) ON DELETE NO ACTION,
  ADD CONSTRAINT audit_logs_dealer_customer_fk
  FOREIGN KEY (dealer_id, customer_id) REFERENCES customers(dealer_id, id) ON DELETE NO ACTION,
  ADD CONSTRAINT audit_logs_dealer_contract_fk
  FOREIGN KEY (dealer_id, contract_id) REFERENCES contracts(dealer_id, id) ON DELETE NO ACTION,
  ADD CONSTRAINT audit_logs_dealer_device_fk
  FOREIGN KEY (dealer_id, device_id) REFERENCES devices(dealer_id, id) ON DELETE NO ACTION;

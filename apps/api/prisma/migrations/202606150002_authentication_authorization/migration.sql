CREATE TYPE auth_token_type AS ENUM ('email_verification', 'password_reset');

ALTER TABLE users
  ADD COLUMN email_verified_at timestamptz,
  ADD COLUMN password_changed_at timestamptz;

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type auth_token_type NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX sessions_refresh_token_hash_key ON sessions(refresh_token_hash);
CREATE INDEX sessions_dealer_id_user_id_idx ON sessions(dealer_id, user_id);
CREATE INDEX sessions_dealer_id_expires_at_idx ON sessions(dealer_id, expires_at);
CREATE INDEX sessions_dealer_id_revoked_at_idx ON sessions(dealer_id, revoked_at);
CREATE INDEX sessions_dealer_id_deleted_at_idx ON sessions(dealer_id, deleted_at);

CREATE UNIQUE INDEX auth_tokens_token_hash_key ON auth_tokens(token_hash);
CREATE INDEX auth_tokens_dealer_id_user_id_type_idx ON auth_tokens(dealer_id, user_id, type);
CREATE INDEX auth_tokens_dealer_id_expires_at_idx ON auth_tokens(dealer_id, expires_at);
CREATE INDEX auth_tokens_dealer_id_used_at_idx ON auth_tokens(dealer_id, used_at);
CREATE INDEX auth_tokens_dealer_id_deleted_at_idx ON auth_tokens(dealer_id, deleted_at);

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER auth_tokens_set_updated_at
BEFORE UPDATE ON auth_tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE sessions
  ADD CONSTRAINT sessions_dealer_user_fk
  FOREIGN KEY (dealer_id, user_id) REFERENCES users(dealer_id, id) ON DELETE CASCADE;

ALTER TABLE auth_tokens
  ADD CONSTRAINT auth_tokens_dealer_user_fk
  FOREIGN KEY (dealer_id, user_id) REFERENCES users(dealer_id, id) ON DELETE CASCADE;

INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, permission_key, permission_name, permission_description
FROM dealers d
CROSS JOIN (
  VALUES
    ('auth:login', 'Login', 'Authenticate into Project X'),
    ('auth:refresh', 'Refresh Session', 'Refresh access tokens'),
    ('auth:logout', 'Logout', 'Revoke own session'),
    ('users:read', 'Read Users', 'Read users within a dealer'),
    ('users:manage', 'Manage Users', 'Create and manage dealer users'),
    ('roles:manage', 'Manage Roles', 'Create and manage roles and permissions'),
    ('platform:manage', 'Platform Management', 'Manage platform-level settings')
) AS p(permission_key, permission_name, permission_description)
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO roles (dealer_id, name, description, is_system)
SELECT d.id, role_name, role_description, true
FROM dealers d
CROSS JOIN (
  VALUES
    ('Super Admin', 'Full platform administration role'),
    ('Dealer', 'Dealer owner or administrator role'),
    ('Sales Agent', 'Dealer sales and onboarding role'),
    ('Customer', 'Customer self-service role')
) AS r(role_name, role_description)
ON CONFLICT (dealer_id, name) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE
  (r.name = 'Super Admin' AND p.key IN (
    'auth:login',
    'auth:refresh',
    'auth:logout',
    'users:read',
    'users:manage',
    'roles:manage',
    'platform:manage'
  ))
  OR (r.name = 'Dealer' AND p.key IN (
    'auth:login',
    'auth:refresh',
    'auth:logout',
    'users:read',
    'users:manage',
    'roles:manage'
  ))
  OR (r.name = 'Sales Agent' AND p.key IN (
    'auth:login',
    'auth:refresh',
    'auth:logout',
    'users:read'
  ))
  OR (r.name = 'Customer' AND p.key IN (
    'auth:login',
    'auth:refresh',
    'auth:logout'
  ))
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;

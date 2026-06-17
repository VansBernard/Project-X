CREATE TYPE dealer_status AS ENUM ('active', 'suspended', 'deleted');

ALTER TABLE dealers
  ADD COLUMN status dealer_status NOT NULL DEFAULT 'active',
  ADD COLUMN suspended_at timestamptz,
  ADD COLUMN suspended_reason text;

CREATE INDEX dealers_status_idx ON dealers(status);
CREATE INDEX dealers_suspended_at_idx ON dealers(suspended_at);

INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, permission_key, permission_name, permission_description
FROM dealers d
CROSS JOIN (
  VALUES
    ('dealers:create', 'Create Dealer', 'Create dealer accounts'),
    ('dealers:suspend', 'Suspend Dealer', 'Suspend dealer accounts'),
    ('dealers:delete', 'Delete Dealer', 'Soft delete dealer accounts'),
    ('dealers:statistics', 'View Dealer Statistics', 'View dealer-level platform statistics'),
    ('customers:create', 'Create Customers', 'Create dealer customers'),
    ('customers:read', 'Read Customers', 'View dealer customers'),
    ('customers:manage', 'Manage Customers', 'Update dealer customers'),
    ('devices:register', 'Register Devices', 'Register financed devices'),
    ('contracts:create', 'Create Contracts', 'Create customer financing contracts'),
    ('payments:read', 'Read Payments', 'View dealer payment records'),
    ('reports:read', 'Read Reports', 'View dealer reports')
) AS p(permission_key, permission_name, permission_description)
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE
  (r.name = 'Super Admin' AND p.key IN (
    'dealers:create',
    'dealers:suspend',
    'dealers:delete',
    'dealers:statistics',
    'customers:create',
    'customers:read',
    'customers:manage',
    'devices:register',
    'contracts:create',
    'payments:read',
    'reports:read'
  ))
  OR (r.name = 'Dealer' AND p.key IN (
    'customers:create',
    'customers:read',
    'customers:manage',
    'devices:register',
    'contracts:create',
    'payments:read',
    'reports:read'
  ))
  OR (r.name = 'Sales Agent' AND p.key IN (
    'customers:create',
    'customers:read',
    'customers:manage',
    'devices:register',
    'payments:read'
  ))
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;

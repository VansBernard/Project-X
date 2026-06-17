ALTER TABLE licenses
  ADD COLUMN key_id text NOT NULL DEFAULT 'default',
  ADD COLUMN signed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN signature text NOT NULL DEFAULT '',
  ADD COLUMN signature_algorithm text NOT NULL DEFAULT 'RSA-SHA256';

CREATE INDEX licenses_dealer_id_key_id_idx ON licenses(dealer_id, key_id);

INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, permission_key, permission_name, permission_description
FROM dealers d
CROSS JOIN (
  VALUES
    ('licenses:issue', 'Issue Licenses', 'Create signed device unlock licenses'),
    ('licenses:read', 'Read Licenses', 'View signed license records'),
    ('licenses:verify', 'Verify Licenses', 'Verify signed license payloads')
) AS p(permission_key, permission_name, permission_description)
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE
  (r.name = 'Super Admin' AND p.key IN ('licenses:issue', 'licenses:read', 'licenses:verify'))
  OR (r.name = 'Dealer' AND p.key IN ('licenses:issue', 'licenses:read', 'licenses:verify'))
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;

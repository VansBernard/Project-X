INSERT INTO permissions (dealer_id, key, name, description)
SELECT d.id, 'devices:recover', 'Recover Devices', 'Issue temporary offline recovery authorizations for devices'
FROM dealers d
ON CONFLICT (dealer_id, key) DO NOTHING;

INSERT INTO role_permissions (dealer_id, role_id, permission_id)
SELECT r.dealer_id, r.id, p.id
FROM roles r
JOIN permissions p ON p.dealer_id = r.dealer_id
WHERE r.name IN ('Dealer', 'Super Admin')
  AND p.key = 'devices:recover'
ON CONFLICT (dealer_id, role_id, permission_id) DO NOTHING;

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const deviceId = 'eb4c3e55-5d0e-4276-8225-8ed7935d1286';

async function main() {
  await prisma.$connect();
  const rows = await prisma.$queryRaw`
    SELECT d.id as device_id, d.serial_number, l.id as license_id, l.license_key, l.license_type, l.expires_at
    FROM devices d
    LEFT JOIN LATERAL (
      SELECT * FROM licenses l2
      WHERE l2.device_id = d.id
        AND l2.deleted_at IS NULL
        AND l2.status = 'active'
        AND (
          l2.license_type = 'permanent'
          OR (l2.license_type = 'temporary' AND l2.expires_at > now())
        )
      ORDER BY l2.expires_at DESC NULLS LAST
      LIMIT 1
    ) l ON true
    WHERE d.id = CAST(${deviceId} AS uuid)
  `;

  console.log(rows);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

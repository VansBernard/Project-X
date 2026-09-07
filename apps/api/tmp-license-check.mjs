import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const BASE_URL = process.env.API_URL || 'http://localhost:4000/api/v1';
const prisma = new PrismaClient();

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealerSlug: 'test-dealer', email: 'admin@test.com', password: 'password123' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.data.accessToken;
}

async function run() {
  try {
    const token = await login();
    console.log('Access token length:', token.length);

    const listRes = await fetch(`${BASE_URL}/dealer/devices?take=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    console.log('dealer/devices status', listRes.status);
    console.log(JSON.stringify(listData, null, 2));

    const deviceId = 'eb4c3e55-5d0e-4276-8225-8ed7935d1286';
    const licenseRes = await fetch(`${BASE_URL}/devices/${deviceId}/license`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const licenseData = await licenseRes.json();
    console.log('/devices/:id/license status', licenseRes.status);
    console.log(JSON.stringify(licenseData, null, 2));

    const dbRes = await prisma.$queryRawUnsafe(`SELECT d.id AS device_id, d.serial_number, count(l.*) AS active_licenses, max(l.license_key) AS sample_license, bool_or(l.license_type='permanent') AS has_permanent FROM devices d LEFT JOIN licenses l ON l.device_id = d.id AND l.deleted_at IS NULL AND l.status='active' AND (l.license_type='permanent' OR (l.license_type='temporary' AND l.expires_at > now())) WHERE d.deleted_at IS NULL GROUP BY d.id ORDER BY active_licenses DESC LIMIT 20;`);
    console.log('Device active license summary:', JSON.stringify(dbRes, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();

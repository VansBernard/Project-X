import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

function stringifyBigInt(key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function run() {
  try {
    const licenseDeviceId = 'eb4c3e55-5d0e-4276-8225-8ed7935d1286';
    const license = await prisma.$queryRawUnsafe(`SELECT l.id, l.license_key, l.license_type, l.status, l.device_id, l.contract_id, l.customer_id, l.dealer_id, l.issued_at, l.expires_at FROM licenses l WHERE l.device_id = '${licenseDeviceId}' AND l.deleted_at IS NULL ORDER BY l.created_at DESC LIMIT 20`);
    console.log('license records for device:', JSON.stringify(license, stringifyBigInt, 2));

    const dealers = await prisma.$queryRawUnsafe(`SELECT id, slug, name, email, status FROM dealers WHERE id IN ('17a8dd3d-1e62-417a-b7c2-f980e3432e6a')`);
    console.log('dealer info:', JSON.stringify(dealers, stringifyBigInt, 2));

    const users = await prisma.$queryRawUnsafe(`SELECT id, dealer_id, email, status, role_id, created_at FROM users WHERE dealer_id = '17a8dd3d-1e62-417a-b7c2-f980e3432e6a' ORDER BY created_at DESC LIMIT 20`);
    console.log('users for dealer:', JSON.stringify(users, stringifyBigInt, 2));

    const testDealer = await prisma.$queryRawUnsafe(`SELECT id, slug, name, email, status FROM dealers WHERE slug = 'test-dealer' LIMIT 1`);
    console.log('test-dealer row:', JSON.stringify(testDealer, stringifyBigInt, 2));

    const testUsers = await prisma.$queryRawUnsafe(`SELECT id, dealer_id, email, status, role_id, created_at FROM users WHERE dealer_id = (SELECT id FROM dealers WHERE slug='test-dealer' LIMIT 1) LIMIT 20`);
    console.log('users for test-dealer:', JSON.stringify(testUsers, stringifyBigInt, 2));

    const devicesForDealer = await prisma.$queryRawUnsafe(`SELECT d.id, d.serial_number, d.dealer_id, d.customer_id, d.status FROM devices d WHERE dealer_id = '17a8dd3d-1e62-417a-b7c2-f980e3432e6a' LIMIT 20`);
    console.log('devices for license dealer:', JSON.stringify(devicesForDealer, stringifyBigInt, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const q = async (label, sql) => {
  console.log('--- ' + label + ' ---');
  const res = await prisma.$queryRawUnsafe(sql);
  console.log(JSON.stringify(res, null, 2));
};

const run = async () => {
  await q('Latest 20 licenses', `SELECT id, license_key, license_type, status, device_id, contract_id, customer_id, dealer_id, issued_at, expires_at, signature, signed_payload, deleted_at, created_at FROM licenses WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`);
  await q('Latest 20 contracts', `SELECT id, contract_number, device_id, customer_id, dealer_id, status, remaining_balance, deleted_at, created_at FROM contracts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`);
  await q('Mismatched contract links', `SELECT l.id AS license_id, l.license_key, l.device_id, l.contract_id, l.customer_id, l.dealer_id, c.device_id AS contract_device, c.customer_id AS contract_customer, c.dealer_id AS contract_dealer, c.status AS contract_status FROM licenses l LEFT JOIN contracts c ON c.id = l.contract_id WHERE l.deleted_at IS NULL AND l.contract_id IS NOT NULL AND (c.id IS NULL OR c.device_id IS DISTINCT FROM l.device_id OR c.customer_id IS DISTINCT FROM l.customer_id OR c.dealer_id IS DISTINCT FROM l.dealer_id) ORDER BY l.created_at DESC LIMIT 100`);
  await q('Contracts with no active licenses', `SELECT c.id, c.contract_number, c.device_id, c.customer_id, c.dealer_id, c.status, c.remaining_balance FROM contracts c LEFT JOIN licenses l ON l.contract_id = c.id AND l.deleted_at IS NULL AND l.status = 'active' WHERE c.deleted_at IS NULL AND (c.status = 'active' OR c.status = 'completed') GROUP BY c.id HAVING COUNT(l.id) = 0 ORDER BY c.created_at DESC LIMIT 50`);
  await q('Licenses missing signature or payload', `SELECT id, license_key, license_type, status, device_id, contract_id, customer_id, dealer_id, issued_at, expires_at, signature, signed_payload, created_at FROM licenses WHERE deleted_at IS NULL AND ((signature IS NULL OR signature = '') OR (signed_payload IS NULL OR signed_payload = '')) ORDER BY created_at DESC LIMIT 50`);
};

run()
  .catch(async (err) => {
    console.error('ERROR', err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

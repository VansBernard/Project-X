import { test } from 'node:test';
import { strict as assert } from 'assert';
import pool from '../db.js';
import { requireDatabase } from './dbHelper.js';

test('GET /api/v1/devices/:hardwareUUID/status returns device and contract info', async (t) => {
  if (!(await requireDatabase(t))) return;

  const client = await pool.connect();
  let customerId, laptopId, contractId;
  const hardwareUUID = `test-hw-${Date.now()}`;

  try {
    const custRes = await client.query(
      'INSERT INTO customers (full_name, email, phone_number) VALUES ($1, $2, $3) RETURNING id',
      ['Integration Tester', `it+${Date.now()}@example.com`, '+10000000000']
    );
    customerId = custRes.rows[0].id;

    const lapRes = await client.query(
      'INSERT INTO laptops (customer_id, hardware_uuid, device_name, total_device_cost) VALUES ($1, $2, $3, $4) RETURNING id',
      [customerId, hardwareUUID, 'Integration Laptop', 1500.00]
    );
    laptopId = lapRes.rows[0].id;

    const now = new Date();
    const contractRes = await client.query(
      `INSERT INTO financing_contracts (laptop_id, customer_id, total_contract_amount, monthly_payment_amount, target_expiration_year, target_expiration_month)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [laptopId, customerId, 1600.00, 100.00, now.getFullYear() + 1, now.getMonth() + 1]
    );
    contractId = contractRes.rows[0].id;
  } finally {
    client.release();
  }

  try {
    const res = await fetch(`http://localhost:3000/api/v1/devices/${hardwareUUID}/status`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.hardware_uuid, hardwareUUID);
    assert.equal(body.owner_name, 'Integration Tester');
    assert.equal(body.laptop_id !== undefined, true);
    assert.equal(body.contract_id !== undefined, true);
  } finally {
    // Cleanup inserted rows
    const cleanup = await pool.connect();
    try {
      if (contractId) await cleanup.query('DELETE FROM financing_contracts WHERE id = $1', [contractId]);
      if (laptopId) await cleanup.query('DELETE FROM laptops WHERE id = $1', [laptopId]);
      if (customerId) await cleanup.query('DELETE FROM customers WHERE id = $1', [customerId]);
    } finally {
      cleanup.release();
    }
  }
});

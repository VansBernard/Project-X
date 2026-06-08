import { test } from 'node:test';
import { strict as assert } from 'assert';
import crypto from 'crypto';
import pool from '../db.js';
import { requireDatabase } from './dbHelper.js';

test('Paystack webhook charge.success records payment and updates contract', async (t) => {
  if (!(await requireDatabase(t))) return;
  const client = await pool.connect();
  let customerId, laptopId, contractId;
  try {
    const cust = await client.query('INSERT INTO customers (full_name, email, phone_number) VALUES ($1,$2,$3) RETURNING id', ['Webhook Tester', `wt${Date.now()}@example.com`, '+19999999999']);
    customerId = cust.rows[0].id;
    const lap = await client.query('INSERT INTO laptops (customer_id, hardware_uuid, device_name, total_device_cost) VALUES ($1,$2,$3,$4) RETURNING id', [customerId, `wh-${Date.now()}`, 'Webhook Laptop', 1000.00]);
    laptopId = lap.rows[0].id;
    const now = new Date();
    const contract = await client.query('INSERT INTO financing_contracts (laptop_id, customer_id, total_contract_amount, monthly_payment_amount, target_expiration_year, target_expiration_month) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, amount_paid_to_date, total_contract_amount', [laptopId, customerId, 1000.00, 100.00, now.getFullYear() + 1, now.getMonth() + 1]);
    contractId = contract.rows[0].id;
  } finally {
    client.release();
  }

  const payload = {
    event: 'charge.success',
    data: {
      reference: `ref-${Date.now()}`,
      amount: 25000, // in kobo => 250.00
      metadata: {
        contract_id: contractId
      }
    }
  };

  const body = JSON.stringify(payload);
  const secret = process.env.PAYSTACK_SECRET || 'paystack_test_secret';
  const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');

  const res = await fetch('http://localhost:3000/api/v1/paystack-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': signature
    },
    body
  });

  assert.equal(res.status, 200);

  // Verify DB changes
  const verify = await pool.query('SELECT * FROM payment_history WHERE paystack_reference = $1', [payload.data.reference]);
  assert.equal(verify.rowCount, 1);

  const contractAfter = await pool.query('SELECT amount_paid_to_date, total_contract_amount FROM financing_contracts WHERE id = $1', [contractId]);
  assert.equal(Number(contractAfter.rows[0].amount_paid_to_date), 250.00);

  // Cleanup
  const cleanup = await pool.connect();
  try {
    await cleanup.query('DELETE FROM payment_history WHERE paystack_reference = $1', [payload.data.reference]);
    await cleanup.query('DELETE FROM financing_contracts WHERE id = $1', [contractId]);
    await cleanup.query('DELETE FROM laptops WHERE id = $1', [laptopId]);
    await cleanup.query('DELETE FROM customers WHERE id = $1', [customerId]);
  } finally {
    cleanup.release();
  }
});

test('Paystack webhook charge.success releases laptop when contract is fully paid', async (t) => {
  if (!(await requireDatabase(t))) return;

  const client = await pool.connect();
  let customerId, laptopId, contractId;
  const reference = `settle-${Date.now()}`;

  try {
    const cust = await client.query('INSERT INTO customers (full_name, email, phone_number) VALUES ($1,$2,$3) RETURNING id', ['Settlement Tester', `st${Date.now()}@example.com`, '+18888888888']);
    customerId = cust.rows[0].id;
    const lap = await client.query('INSERT INTO laptops (customer_id, hardware_uuid, device_name, total_device_cost) VALUES ($1,$2,$3,$4) RETURNING id', [customerId, `settled-${Date.now()}`, 'Settled Laptop', 1000.00]);
    laptopId = lap.rows[0].id;
    const now = new Date();
    const contract = await client.query('INSERT INTO financing_contracts (laptop_id, customer_id, total_contract_amount, monthly_payment_amount, target_expiration_year, target_expiration_month) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [laptopId, customerId, 1000.00, 100.00, now.getFullYear() + 1, now.getMonth() + 1]);
    contractId = contract.rows[0].id;
  } finally {
    client.release();
  }

  const payload = {
    event: 'charge.success',
    data: {
      reference,
      amount: 100000,
      metadata: {
        contract_id: contractId
      }
    }
  };

  const body = JSON.stringify(payload);
  const secret = process.env.PAYSTACK_SECRET || 'paystack_test_secret';
  const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');

  try {
    const res = await fetch('http://localhost:3000/api/v1/paystack-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature
      },
      body
    });

    assert.equal(res.status, 200);

    const contractAfter = await pool.query('SELECT contract_status, amount_paid_to_date, release_token FROM financing_contracts WHERE id = $1', [contractId]);
    assert.equal(contractAfter.rows[0].contract_status, 'Fully_Paid');
    assert.equal(Number(contractAfter.rows[0].amount_paid_to_date), 1000.00);
    assert.match(contractAfter.rows[0].release_token, /^[0-9]{8}$/);

    const customerAfter = await pool.query('SELECT account_status FROM customers WHERE id = $1', [customerId]);
    assert.equal(customerAfter.rows[0].account_status, 'Fully_Paid');

    const laptopAfter = await pool.query('SELECT device_status FROM laptops WHERE id = $1', [laptopId]);
    assert.equal(laptopAfter.rows[0].device_status, 'Released');
  } finally {
    const cleanup = await pool.connect();
    try {
      await cleanup.query('DELETE FROM payment_history WHERE paystack_reference = $1', [reference]);
      await cleanup.query('DELETE FROM time_token_log WHERE contract_id = $1', [contractId]);
      await cleanup.query('DELETE FROM financing_contracts WHERE id = $1', [contractId]);
      await cleanup.query('DELETE FROM laptops WHERE id = $1', [laptopId]);
      await cleanup.query('DELETE FROM customers WHERE id = $1', [customerId]);
    } finally {
      cleanup.release();
    }
  }
});

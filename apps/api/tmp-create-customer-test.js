import { request } from 'node:http';
import { stringify } from 'node:querystring';

async function run() {
  const url = new URL('http://localhost:4000/api/v1/auth/login');
  const loginPayload = JSON.stringify({ dealerSlug: 'test-dealer', email: 'admin@test.com', password: 'password123' });
  const loginRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: loginPayload });
  console.log('login status', loginRes.status);
  const loginBody = await loginRes.text();
  console.log('login body', loginBody);
  const token = JSON.parse(loginBody)?.data?.accessToken;
  if (!token) {
    console.error('no token');
    process.exit(1);
  }
  const customerPayload = JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+233123456789',
    address: '123 Main St',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'GH',
    metadata: { source: 'desktop-registration' }
  });
  const createRes = await fetch('http://localhost:4000/api/v1/dealer/customers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: customerPayload });
  console.log('create status', createRes.status);
  console.log('create body', await createRes.text());
}

run().catch((err) => { console.error(err); process.exit(1); });

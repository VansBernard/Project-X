import http from 'http';

async function test() {
  const base = 'http://localhost:4000/api/v1';
  
  try {
    // Login
    console.log('[1] Logging in...');
    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealerSlug: 'test-dealer',
        email: 'admin@test.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.data || !loginData.data.accessToken) {
      console.error('[1] Login failed:', loginData);
      process.exit(1);
    }
    
    const token = loginData.data.accessToken;
    console.log('[1] Login successful');
    
    // Registration
    console.log('[2] Registering device...');
    const now = Date.now();
    const payload = {
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: `john-${now}@example.com`,
        phone: '+234801234567',
        address: '123 Main St',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG'
      },
      device: {
        serialNumber: `TEST-${now}`,
        manufacturer: 'Samsung',
        model: 'Galaxy A10',
        hardwareFingerprint: `abc123${now}`
      },
      contract: {
        contractNumber: `CONTRACT-${now}`,
        currency: 'NGN',
        devicePrice: 5000,
        deposit: 1000,
        installmentAmount: 571.43,
        installmentCount: 7,
        paymentPlan: 'weekly',
        firstDueDate: new Date(Date.now() + 7*86400000).toISOString().slice(0,10)
      }
    };
    
    const regRes = await fetch(base + '/dealer/registrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const regData = await regRes.text();
    console.log('[2] Status:', regRes.status);
    console.log('[2] Body:', regData);
    
  } catch (e) {
    console.error('[ERROR]', e.message);
    process.exit(1);
  }
}

test();

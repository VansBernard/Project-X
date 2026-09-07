import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api/v1';

async function testRegistration() {
  try {
    console.log('[TEST] Starting device registration test...');
    
    // First, login to get a token
    console.log('[TEST] Step 1: Logging in...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealerSlug: 'test-dealer',
        email: 'dealer@example.com',
        password: 'testpassword123'
      })
    });

    if (!loginRes.ok) {
      const error = await loginRes.text();
      console.error('[TEST] Login failed:', loginRes.status, error);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    console.log('[TEST] Login successful, got token:', token.substring(0, 20) + '...');

    // Now try to register a device
    console.log('[TEST] Step 2: Registering device...');
    const regRes = await fetch(`${API_BASE}/dealer/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customer: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+234801234567',
          address: '123 Main St',
          city: 'Lagos',
          state: 'Lagos',
          country: 'NG'
        },
        device: {
          serialNumber: 'TEST-SERIAL-' + Date.now(),
          manufacturer: 'Samsung',
          model: 'Galaxy A10',
          hardwareFingerprint: 'abc123def456'
        },
        contract: {
          contractNumber: 'CONTRACT-' + Date.now(),
          currency: 'NGN',
          devicePrice: 5000,
          deposit: 1000,
          installmentAmount: 571.43,
          installmentCount: 7,
          paymentPlan: 'weekly',
          firstDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      })
    });

    const responseText = await regRes.text();
    console.log('[TEST] Registration response status:', regRes.status);
    console.log('[TEST] Registration response:', responseText);

    if (!regRes.ok) {
      console.error('[TEST] Registration FAILED');
      return;
    }

    const regData = JSON.parse(responseText);
    console.log('[TEST] Registration SUCCESS:', regData.data);

  } catch (error) {
    console.error('[TEST] Error:', error);
  }
}

testRegistration();

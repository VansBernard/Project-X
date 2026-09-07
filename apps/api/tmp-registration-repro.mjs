const BASE_URL = 'http://localhost:4000/api/v1';

async function main() {
  try {
    const loginBody = {
      dealerSlug: 'test-dealer',
      email: 'admin@test.com',
      password: 'password123'
    };

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody)
    });
    const loginData = await loginRes.json();
    console.log('LOGIN', loginRes.status, JSON.stringify(loginData, null, 2));

    if (!loginData.data?.accessToken) {
      throw new Error('Login did not return accessToken');
    }

    const token = loginData.data.accessToken;

    const createCustomer = {
      firstName: 'API',
      lastName: 'Tester',
      email: `apitest+${Date.now()}@example.com`,
      phone: '+1234567890',
      address: '123 API St',
      city: 'Testville',
      state: 'TS',
      country: 'GH',
      metadata: { source: 'desktop-registration' }
    };

    const custRes = await fetch(`${BASE_URL}/dealer/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(createCustomer)
    });
    const custData = await custRes.json();
    console.log('CUSTOMER', custRes.status, JSON.stringify(custData, null, 2));

    if (!custData.data?.id) {
      throw new Error('Customer creation failed');
    }

    const customerId = custData.data.id;

    const createDevice = {
      customerId,
      serialNumber: `API-SN-${Date.now()}`,
      manufacturer: 'API Inc',
      model: 'API-1',
      hardwareFingerprint: 'fp-123456',
      metadata: { mac: '00-11-22-33-44-55' }
    };

    const deviceRes = await fetch(`${BASE_URL}/dealer/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(createDevice)
    });
    const deviceData = await deviceRes.json();
    console.log('DEVICE', deviceRes.status, JSON.stringify(deviceData, null, 2));

    if (!deviceData.data?.id) {
      throw new Error('Device creation failed');
    }

    const deviceId = deviceData.data.id;

    const createContract = {
      customerId,
      deviceId,
      contractNumber: `PX-TEST-${Date.now()}`,
      currency: 'GHS',
      devicePrice: 100,
      deposit: 10,
      installmentAmount: 15,
      installmentCount: 6,
      firstDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: { source: 'desktop-registration' }
    };

    const contractRes = await fetch(`${BASE_URL}/dealer/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(createContract)
    });
    const contractData = await contractRes.json();
    console.log('CONTRACT', contractRes.status, JSON.stringify(contractData, null, 2));

  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  }
}

main();

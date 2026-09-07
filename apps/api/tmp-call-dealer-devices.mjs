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
    console.log('LOGIN', loginRes.status);

    if (!loginData.data?.accessToken) {
      console.error('Login failed, no access token');
      console.error(loginData);
      process.exit(1);
    }

    const token = loginData.data.accessToken;

      const meRes = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meRes.json();
      console.log('ME', meRes.status, JSON.stringify(meData, null, 2));

      const devicesRes = await fetch(`${BASE_URL}/dealer/devices?take=100`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const devicesData = await devicesRes.json();
      console.log('DEVICES', devicesRes.status, JSON.stringify(devicesData, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

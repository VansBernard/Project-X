const baseUrl = "http://localhost:4000/api/v1";

async function test() {
  try {
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealerSlug: "test-dealer",
        email: "admin@test.com",
        password: "password123"
      })
    });

    const loginData = await loginRes.json();
    if (!loginData.data?.accessToken) {
      console.log("LOGIN FAILED", loginData);
      return;
    }

    const token = loginData.data.accessToken;
    console.log("✓ Login successful, token acquired");

    // 2. Create customer
    const customerRes = await fetch(`${baseUrl}/dealer/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+233123456789",
        address: "123 Main St",
        city: "Accra",
        state: "Greater Accra",
        country: "GH",
        metadata: { source: "desktop-registration" }
      })
    });

    const customerData = await customerRes.json();
    console.log(`\n✗ CREATE CUSTOMER ${customerRes.status}`);
    console.log("Response:", JSON.stringify(customerData, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();

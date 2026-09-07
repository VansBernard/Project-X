import fetch from "node-fetch";

async function run() {
  const loginRes = await fetch("http://localhost:4000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dealerSlug: "test-dealer",
      email: "admin@test.com",
      password: "password123"
    })
  });

  const loginJson = await loginRes.json();
  console.log("login status", loginRes.status);
  console.log(JSON.stringify(loginJson, null, 2));

  if (!loginJson?.data?.accessToken) {
    throw new Error("Login failed");
  }

  const token = loginJson.data.accessToken;
  const customerData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+233123456789",
    address: "123 Main St",
    city: "Accra",
    state: "Greater Accra",
    country: "GH",
    metadata: { source: "desktop-registration" }
  };

  const createRes = await fetch("http://localhost:4000/api/v1/dealer/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(customerData)
  });

  const createJson = await createRes.json();
  console.log("create status", createRes.status);
  console.log(JSON.stringify(createJson, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

import fetch from "node-fetch";

const BASE_URL = "http://localhost:4000/api/v1";
const timestamp = Date.now();

async function testSignupWithValidBankInfo() {
  console.log("\n=== Test 1: Signup with Valid Bank Info ===");
  const body = {
    dealer: {
      name: `Test Dealer ${timestamp}`,
      slug: `test-dealer-${timestamp}`,
      email: `dealer-${timestamp}@example.com`,
      country: "NG",
      timezone: "UTC",
      metadata: {
        settlementBank: "007", // GTBank code
        settlementAccountNumber: "0123456789",
        payoutMethod: "bank"
      }
    },
    owner: {
      email: `dealer-${timestamp}@example.com`,
      password: "password123",
      firstName: "Test",
      lastName: "Dealer",
      phone: "+2348123456789"
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/dealers/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = (await response.json()) as any;
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 201) {
      const dealerSlug = data.data?.login?.dealerSlug;
      const ownerEmail = data.data?.login?.email;
      console.log("✅ Signup successful!");
      console.log("   Dealer Slug:", dealerSlug);
      console.log("   Owner Email:", ownerEmail);
      return { dealerSlug, ownerEmail };
    } else {
      console.log("❌ Signup failed!");
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  }
}

async function testSignupWithInvalidBankInfo() {
  console.log("\n=== Test 2: Signup with Invalid Bank Info (Should Still Succeed) ===");
  const body = {
    dealer: {
      name: `Test Dealer Invalid ${timestamp}`,
      slug: `test-dealer-invalid-${timestamp}`,
      email: `dealer-invalid-${timestamp}@example.com`,
      country: "NG",
      timezone: "UTC",
      metadata: {
        settlementBank: "INVALID_BANK_CODE",
        settlementAccountNumber: "INVALID_ACCOUNT",
        payoutMethod: "bank"
      }
    },
    owner: {
      email: `dealer-invalid-${timestamp}@example.com`,
      password: "password123",
      firstName: "Test",
      lastName: "Invalid",
      phone: "+2348123456789"
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/dealers/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = (await response.json()) as any;
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 201) {
      console.log("✅ Signup succeeded even with invalid bank info!");
      console.log("   Paystack Error:", data.data?.paystackSubaccountError);
      console.log("   Paystack Status:", data.data?.paystackStatus);

      const dealerSlug = data.data?.login?.dealerSlug;
      const ownerEmail = data.data?.login?.email;
      return { dealerSlug, ownerEmail, hadPaystackError: !!data.data?.paystackSubaccountError };
    } else {
      console.log("❌ Signup failed!");
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  }
}

async function testLogin(dealerSlug: string, email: string, password: string) {
  console.log(`\n=== Test 3: Login as ${email} ===`);
  const body = {
    dealerSlug,
    email,
    password
  };

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = (await response.json()) as any;
    console.log("Status:", response.status);

    if (response.status === 200) {
      console.log("✅ Login successful!");
      console.log("   Access Token:", data.data?.accessToken?.substring(0, 50) + "...");
      console.log("   Session ID:", data.data?.sessionId);
      return data.data?.accessToken;
    } else {
      console.log("❌ Login failed!");
      console.log("   Error:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  }
}

async function runAllTests() {
  console.log("Starting Dealer Signup & Login Tests...");

  // Test 1: Valid signup
  const result1 = await testSignupWithValidBankInfo();
  if (result1) {
    await new Promise((r) => setTimeout(r, 1000));
    const token = await testLogin(result1.dealerSlug, result1.ownerEmail, "password123");
    if (token) {
      console.log("\n✅ Test 1 PASSED: Signup with valid info + Login works");
    } else {
      console.log("\n❌ Test 1 FAILED: Login failed");
    }
  }

  // Test 2: Invalid bank info (should still succeed)
  const result2 = await testSignupWithInvalidBankInfo();
  if (result2 && result2.hadPaystackError) {
    await new Promise((r) => setTimeout(r, 1000));
    const token = await testLogin(result2.dealerSlug, result2.ownerEmail, "password123");
    if (token) {
      console.log("\n✅ Test 2 PASSED: Signup with invalid Paystack info still succeeds + Login works");
    } else {
      console.log("\n❌ Test 2 FAILED: Login should work even with Paystack error");
    }
  } else if (!result2?.hadPaystackError) {
    console.log("\n❌ Test 2 FAILED: Should have had Paystack error");
  }

  console.log("\n=== All Tests Complete ===");
}

runAllTests().catch(console.error);

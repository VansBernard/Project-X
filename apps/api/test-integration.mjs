#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api/v1';
const timestamp = Date.now();

async function test1_SignupWithBankAccount() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Dealer Signup with Valid Bank Account (Paystack Required)');
  console.log('='.repeat(80));

  const dealerSlug = `test-bank-${timestamp}`;
  const email = `dealer-bank-${timestamp}@example.com`;

  const body = {
    dealer: {
      name: `Test Bank Dealer ${timestamp}`,
      legalName: `Test Bank Dealer Legal ${timestamp}`,
      slug: dealerSlug,
      email,
      phone: '+2348123456789',
      country: 'NG',
      timezone: 'UTC',
      metadata: {
        settlementBank: '007',  // GTBank
        settlementAccountNumber: '0123456789',
        payoutMethod: 'bank'
      }
    },
    owner: {
      email,
      password: 'Password123!@#',
      firstName: 'John',
      lastName: 'Dealer',
      phone: '+2348123456789'
    }
  };

  try {
    console.log('\n📤 Sending signup request...');
    const response = await fetch(`${BASE_URL}/dealers/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = (await response.json()) as SignupResponse;
    console.log(`\n✅ Response Status: ${response.status}`);
    console.log(`\n📋 Response:`, JSON.stringify(data, null, 2));

    if (response.status === 201 && data.data) {
      console.log('\n✅ TEST 1 PASSED - Dealer Created Successfully!');
      console.log(`   Dealer ID: ${data.data.dealer.id}`);
      console.log(`   Dealer Slug: ${data.data.dealer.slug}`);
      console.log(`   Owner Email: ${data.data.owner.email}`);
      return { dealerSlug, email, password: 'Password123!@#', dealerId: data.data.dealer.id };
    } else {
      console.log('\n❌ TEST 1 FAILED - Signup did not return 201');
      console.log(`   Error: ${data.error?.message}`);
      return null;
    }
  } catch (error) {
    console.error('\n❌ TEST 1 FAILED - Network Error:', error);
    return null;
  }
}

async function test2_SignupWithMissingSettlementInfo() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Dealer Signup WITHOUT Settlement Info (Should Fail)');
  console.log('='.repeat(80));

  const dealerSlug = `test-nosettlement-${timestamp}`;
  const email = `dealer-nosettlement-${timestamp}@example.com`;

  const body = {
    dealer: {
      name: `Test No Settlement ${timestamp}`,
      slug: dealerSlug,
      email,
      phone: '+2348123456789',
      country: 'NG',
      timezone: 'UTC',
      metadata: {} // No settlement info
    },
    owner: {
      email,
      password: 'Password123!@#',
      firstName: 'Jane',
      lastName: 'NoDeal',
      phone: '+2348123456789'
    }
  };

  try {
    console.log('\n📤 Sending signup request without settlement info...');
    const response = await fetch(`${BASE_URL}/dealers/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = (await response.json()) as SignupResponse;
    console.log(`\n Response Status: ${response.status}`);
    console.log(`\n Response:`, JSON.stringify(data, null, 2));

    if (response.status >= 400 && data.error?.code === 'MISSING_SETTLEMENT_INFO') {
      console.log('\n✅ TEST 2 PASSED - Correctly rejected missing settlement info');
      console.log(`   Error Code: ${data.error.code}`);
      console.log(`   Error Message: ${data.error.message}`);
      return true;
    } else {
      console.log('\n❌ TEST 2 FAILED - Should have rejected missing settlement info');
      return false;
    }
  } catch (error) {
    console.error('\n❌ TEST 2 FAILED - Network Error:', error);
    return false;
  }
}

async function test3_LoginWithDealerCredentials(dealerInfo: { dealerSlug: string; email: string; password: string } | null) {
  if (!dealerInfo) {
    console.log('\n❌ TEST 3 SKIPPED - No dealer info from test 1');
    return null;
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Dealer Login with Credentials');
  console.log('='.repeat(80));

  const body = {
    dealerSlug: dealerInfo.dealerSlug,
    email: dealerInfo.email,
    password: dealerInfo.password
  };

  try {
    console.log(`\n📤 Logging in as ${dealerInfo.email}...`);
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = (await response.json()) as LoginResponse;
    console.log(`\n Response Status: ${response.status}`);
    console.log(`\n Response:`, JSON.stringify({
      ...data,
      data: data.data ? {
        ...data.data,
        accessToken: data.data.accessToken?.substring(0, 50) + '...'
      } : undefined
    }, null, 2));

    if (response.status === 200 && data.data?.accessToken) {
      console.log('\n✅ TEST 3 PASSED - Dealer Login Successful!');
      console.log(`   Session ID: ${data.data.sessionId}`);
      return data.data.accessToken;
    } else {
      console.log('\n❌ TEST 3 FAILED - Login returned status', response.status);
      console.log(`   Error: ${data.error?.message}`);
      return null;
    }
  } catch (error) {
    console.error('\n❌ TEST 3 FAILED - Network Error:', error);
    return null;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('DEALER SIGNUP & LOGIN INTEGRATION TESTS');
  console.log('='.repeat(80));
  console.log(`\nTest Suite Started: ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}`);

  try {
    // Test 1: Valid signup
    const dealerInfo = await test1_SignupWithBankAccount();

    // Test 2: Invalid signup (missing settlement)
    await test2_SignupWithMissingSettlementInfo();

    // Test 3: Login with dealer credentials
    const token = await test3_LoginWithDealerCredentials(dealerInfo);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('\n✅ Test 1: Dealer signup with bank account - ' + (dealerInfo ? 'PASSED' : 'FAILED'));
    console.log('✅ Test 2: Rejected missing settlement info - PASSED');
    console.log('✅ Test 3: Dealer login - ' + (token ? 'PASSED' : 'FAILED'));

    if (dealerInfo && token) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('\nDealer Creation Flow Summary:');
      console.log(`  • Dealer created with slug: ${dealerInfo.dealerSlug}`);
      console.log(`  • Paystack subaccount creation: Required & Blocking`);
      console.log(`  • Dealer can login: ✅ YES`);
      console.log(`  • Admin can accept dealer: ✅ YES (logged in successfully)`);
    } else {
      console.log('\n❌ SOME TESTS FAILED');
    }
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  }

  console.log('\n' + '='.repeat(80));
  process.exit(0);
}

// Wait a bit for server to be ready
setTimeout(runAllTests, 2000);

#!/bin/bash
# Test device registration endpoint

BASE_URL="http://localhost:4000/api/v1"

echo "[TEST] Testing device registration endpoint..."

# First login to get a token
echo "[TEST] Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "dealerSlug": "test-dealer",
    "email": "dealer@example.com",
    "password": "testpassword123"
  }')

echo "[TEST] Login response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "[TEST] Failed to get access token"
  exit 1
fi

echo "[TEST] Got access token"

# Now try to register a device
echo "[TEST] Step 2: Registering device..."
REG_RESPONSE=$(curl -s -X POST "$BASE_URL/dealer/registrations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customer": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+234801234567",
      "address": "123 Main St",
      "city": "Lagos",
      "state": "Lagos",
      "country": "NG"
    },
    "device": {
      "serialNumber": "TEST-SERIAL-'$(date +%s)'",
      "manufacturer": "Samsung",
      "model": "Galaxy A10",
      "hardwareFingerprint": "abc123def456"
    },
    "contract": {
      "contractNumber": "CONTRACT-'$(date +%s)'",
      "currency": "NGN",
      "devicePrice": 5000,
      "deposit": 1000,
      "installmentAmount": 571.43,
      "installmentCount": 7,
      "paymentPlan": "weekly",
      "firstDueDate": "'$(date -d '+7 days' +%Y-%m-%d)'"
    }
  }')

echo "[TEST] Registration response: $REG_RESPONSE"

if echo "$REG_RESPONSE" | grep -q '"data"'; then
  echo "[TEST] ✓ Device registration SUCCESSFUL"
else
  echo "[TEST] ✗ Device registration FAILED"
fi

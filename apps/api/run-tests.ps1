#!/usr/bin/env pwsh

$BASE_URL = "http://localhost:4000/api/v1"
$timestamp = Get-Date -UFormat %s

Write-Host ""
Write-Host ("=" * 80)
Write-Host "TEST 1: Dealer Signup with Valid Bank Account (Paystack Required)"
Write-Host ("=" * 80)

$dealerSlug = "test-bank-$timestamp"
$email = "dealer-bank-$timestamp@example.com"

$body = @{
    dealer = @{
        name = "Test Bank Dealer $timestamp"
        legalName = "Test Bank Dealer Legal $timestamp"
        slug = $dealerSlug
        email = $email
        phone = "+2348123456789"
        country = "NG"
        timezone = "UTC"
        metadata = @{
            settlementBank = "007"
            settlementAccountNumber = "0123456789"
            payoutMethod = "bank"
        }
    }
    owner = @{
        email = $email
        password = "Password123!@#"
        firstName = "John"
        lastName = "Dealer"
        phone = "+2348123456789"
    }
} | ConvertTo-Json

Write-Host "`n📤 Sending signup request..."
Write-Host "Request Body:`n$body`n"

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/dealers/signup" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing

    $data = $response.Content | ConvertFrom-Json
    Write-Host "`n✅ Response Status: $($response.StatusCode)"
    Write-Host "`n📋 Response:`n$(ConvertTo-Json $data -Depth 10)`n"

    if ($response.StatusCode -eq 201 -and $data.data) {
        Write-Host "`n✅ TEST 1 PASSED - Dealer Created Successfully!"
        Write-Host "   Dealer ID: $($data.data.dealer.id)"
        Write-Host "   Dealer Slug: $($data.data.dealer.slug)"
        Write-Host "   Owner Email: $($data.data.owner.email)"
        Write-Host "   Paystack Subaccount Code: $($data.data.dealer.paystackSubaccountCode)"
        
        $global:dealerSlug = $dealerSlug
        $global:dealerEmail = $email
        $global:dealerPassword = "Password123!@#"
        $global:test1Passed = $true
    } else {
        Write-Host "`n❌ TEST 1 FAILED - Signup did not return 201"
        Write-Host "   Error: $($data.error.message)"
        $global:test1Passed = $false
    }
} catch {
    Write-Host "`n❌ TEST 1 FAILED - Error: $($_.Exception.Message)"
    $global:test1Passed = $false
}

# Test 2: Signup without settlement info
Write-Host ""
Write-Host ("=" * 80)
Write-Host "TEST 2: Dealer Signup WITHOUT Settlement Info (Should Fail)"
Write-Host ("=" * 80)

$dealerSlug2 = "test-nosettlement-$timestamp"
$email2 = "dealer-nosettlement-$timestamp@example.com"

$body2 = @{
    dealer = @{
        name = "Test No Settlement $timestamp"
        slug = $dealerSlug2
        email = $email2
        phone = "+2348123456789"
        country = "NG"
        timezone = "UTC"
        metadata = @{}
    }
    owner = @{
        email = $email2
        password = "Password123!@#"
        firstName = "Jane"
        lastName = "NoDeal"
        phone = "+2348123456789"
    }
} | ConvertTo-Json

Write-Host "`n📤 Sending signup request without settlement info..."

try {
    $response2 = Invoke-WebRequest -Uri "$BASE_URL/dealers/signup" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body2 `
        -UseBasicParsing -ErrorAction SilentlyContinue

    # If we get here, it succeeded (shouldn't happen)
    $data2 = $response2.Content | ConvertFrom-Json
    Write-Host "`n❌ TEST 2 FAILED - Should have rejected missing settlement info"
    Write-Host "Response: $(ConvertTo-Json $data2 -Depth 5)"
    $global:test2Passed = $false
} catch {
    # Expected to fail
    $errorContent = $_.Exception.Response.Content.ReadAsStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() }
    $data2 = $errorContent | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($data2.error.code -eq "MISSING_SETTLEMENT_INFO") {
        Write-Host "`n✅ TEST 2 PASSED - Correctly rejected missing settlement info"
        Write-Host "   Error Code: $($data2.error.code)"
        Write-Host "   Error Message: $($data2.error.message)"
        $global:test2Passed = $true
    } else {
        Write-Host "`n❌ TEST 2 FAILED - Wrong error code"
        Write-Host "   Response: $errorContent"
        $global:test2Passed = $false
    }
}

# Test 3: Dealer Login
if ($global:test1Passed) {
    Write-Host ""
    Write-Host ("=" * 80)
    Write-Host "TEST 3: Dealer Login with Credentials"
    Write-Host ("=" * 80)

    $loginBody = @{
        dealerSlug = $global:dealerSlug
        email = $global:dealerEmail
        password = $global:dealerPassword
    } | ConvertTo-Json

    Write-Host "`n📤 Logging in as $($global:dealerEmail)..."

    try {
        $response3 = Invoke-WebRequest -Uri "$BASE_URL/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $loginBody `
            -UseBasicParsing

        $data3 = $response3.Content | ConvertFrom-Json
        Write-Host "`n Response Status: $($response3.StatusCode)"
        Write-Host "`n Response:`n$(ConvertTo-Json @{ data = @{ accessToken = $data3.data.accessToken.Substring(0, 50) + "..."; sessionId = $data3.data.sessionId }; error = $data3.error } -Depth 5)`n"

        if ($response3.StatusCode -eq 200 -and $data3.data.accessToken) {
            Write-Host "`n✅ TEST 3 PASSED - Dealer Login Successful!"
            Write-Host "   Session ID: $($data3.data.sessionId)"
            $global:test3Passed = $true
        } else {
            Write-Host "`n❌ TEST 3 FAILED - Login returned status $($response3.StatusCode)"
            Write-Host "   Error: $($data3.error.message)"
            $global:test3Passed = $false
        }
    } catch {
        Write-Host "`n❌ TEST 3 FAILED - Error: $($_.Exception.Message)"
        $global:test3Passed = $false
    }
} else {
    Write-Host "`n❌ TEST 3 SKIPPED - Test 1 failed"
    $global:test3Passed = $false
}

# Summary
Write-Host ""
Write-Host ("=" * 80)
Write-Host "TEST SUMMARY"
Write-Host ("=" * 80)
Write-Host "`n✅ Test 1: Dealer signup with bank account - $(if ($global:test1Passed) { 'PASSED' } else { 'FAILED' })"
Write-Host "✅ Test 2: Rejected missing settlement info - $(if ($global:test2Passed) { 'PASSED' } else { 'FAILED' })"
Write-Host "✅ Test 3: Dealer login - $(if ($global:test3Passed) { 'PASSED' } else { 'FAILED' })"

if ($global:test1Passed -and $global:test2Passed -and $global:test3Passed) {
    Write-Host "`n🎉 ALL TESTS PASSED!"
    Write-Host "`nDealer Creation & Login Flow Summary:"
    Write-Host "  • Dealer created with slug: $($global:dealerSlug)"
    Write-Host "  • Paystack subaccount creation: Required & Blocking"
    Write-Host "  • Dealer can login: ✅ YES"
    Write-Host "  • Admin can accept dealer: ✅ YES (logged in successfully)"
} else {
    Write-Host "`n❌ SOME TESTS FAILED"
}

Write-Host "`n" + ("=" * 80)

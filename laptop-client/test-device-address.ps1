$ErrorActionPreference = 'Stop'

Write-Host "=== Device Address Validation Test ===" -ForegroundColor Cyan
Write-Host ""

# Get hardware UUID from WMI
$ignoredValues = @("", "0", "unknown", "none", "to be filled by o.e.m.", "to be filled by oem", "default string", "system serial number")
$hardwareUuid = $null

try {
    $result = Get-WmiObject Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    if ($result) {
        $candidateUuid = if ($result.UUID) { $result.UUID.Trim() } else { $null }
        if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
            $hardwareUuid = $candidateUuid
        }
    }
} catch {}

if (-not $hardwareUuid) {
    try {
        $result = Get-WmiObject Win32_BIOS -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $hardwareUuid = $candidateUuid
            }
        }
    } catch {}
}

if (-not $hardwareUuid) {
    try {
        $result = Get-WmiObject Win32_BaseBoard -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $hardwareUuid = $candidateUuid
            }
        }
    } catch {}
}

if (-not $hardwareUuid) {
    Write-Host "ERROR: Could not find hardware UUID!" -ForegroundColor Red
    exit 1
}

Write-Host "Hardware UUID:" -ForegroundColor Green
Write-Host "  $hardwareUuid"
Write-Host ""

# Generate device address step by step
Write-Host "Step-by-Step Calculation:" -ForegroundColor Cyan
Write-Host ""

$normalized = $hardwareUuid.Trim().ToUpperInvariant()
Write-Host "1. Normalized: $normalized"

$bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hash = $sha256.ComputeHash($bytes)
$sha256.Dispose()

$hashHex = [System.BitConverter]::ToString($hash) -replace '-', ''
Write-Host "2. SHA256 Hex: $hashHex"

$first12 = $hashHex.Substring(0, 12)
Write-Host "3. First 12 chars: $first12"

$part1 = $first12.Substring(0, 4)
$part2 = $first12.Substring(4, 4)
$part3 = $first12.Substring(8, 4)

Write-Host "4. Split: [$part1] [$part2] [$part3]"

$deviceAddress = "$part1-$part2-$part3"
Write-Host "5. Device Address: $deviceAddress"

Write-Host ""
Write-Host "=== Registration Payload ===" -ForegroundColor Green
Write-Host ""
Write-Host "These values will be sent to the backend:"
Write-Host ""
Write-Host "@{"
Write-Host "  hardwareUuid = `"$hardwareUuid`""
Write-Host "  deviceAddress = `"$deviceAddress`""
Write-Host "  customerName = `"Your Name`""
Write-Host "  customerEmail = `"your@email.com`""
Write-Host "  phoneNumber = `"+1234567890`""
Write-Host "  deviceName = `"Test Device`""
Write-Host "  totalContractAmount = 1000"
Write-Host "  paymentAmount = 100"
Write-Host "  paymentFrequency = `"Monthly`""
Write-Host "}"
Write-Host ""

# Test locally with backend endpoint
Write-Host "=== Testing Backend Validation ===" -ForegroundColor Cyan
Write-Host ""

$backendUrl = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "https://project-x-kg81.onrender.com" }
Write-Host "Backend URL: $backendUrl"
Write-Host ""

$body = @{
    hardwareUuid = $hardwareUuid
    deviceAddress = $deviceAddress
} | ConvertTo-Json

Write-Host "Sending test request..."
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/api/v1/debug/device-address" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Backend Response:" -ForegroundColor Green
    Write-Host "  Generated: $($result.generatedDeviceAddress)"
    Write-Host "  Provided:  $($result.providedDeviceAddress)"
    Write-Host "  Match: $($result.matches)"
    
    if ($result.matches) {
        Write-Host ""
        Write-Host "SUCCESS! Addresses match. Registration should work!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "MISMATCH! Addresses don't match. Something is wrong." -ForegroundColor Red
        Write-Host ""
        Write-Host "Debug info:"
        Write-Host "  Generated (uppercase): $($result.debug.generatedAddressUpperCase)"
        Write-Host "  Provided (uppercase):  $($result.debug.providedAddressUpperCase)"
        Write-Host "  Generated length: $($result.debug.generatedLength)"
        Write-Host "  Provided length:  $($result.debug.providedLength)"
    }
} catch {
    Write-Host ""
    Write-Host "Could not test with backend: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This is OK - you can still try registration in the app."
}

Write-Host ""
Write-Host "Copy these values to use in registration:"
Write-Host ""
Write-Host "UUID: $hardwareUuid"
Write-Host "Address: $deviceAddress"

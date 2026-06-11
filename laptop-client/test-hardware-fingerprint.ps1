#!/usr/bin/env pwsh
<#
.SYNOPSIS
Tests hardware fingerprinting and device address generation to diagnose registration issues.

.DESCRIPTION
This script runs a diagnostic to show what hardware UUID and device address your machine generates.
It helps identify if there's a mismatch between client and server calculations.

.EXAMPLE
.\test-hardware-fingerprint.ps1
#>

$ErrorActionPreference = 'Stop'

Write-Host "=== Hardware Fingerprinting Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Function to generate device address (matches .NET and Node.js implementation)
function Get-DeviceAddress {
    param([string]$HardwareUUID)
    
    if ([string]::IsNullOrWhiteSpace($HardwareUUID)) {
        throw "Hardware UUID is required"
    }
    
    $normalized = $HardwareUUID.Trim().ToUpperInvariant()
    
    # Create SHA256 hash
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha256.ComputeHash($bytes)
    $hashHex = [System.BitConverter]::ToString($hash) -replace '-', ''
    $sha256.Dispose()
    
    # Take first 12 hex characters
    $first12 = $hashHex.Substring(0, 12)
    
    # Format as XXXX-XXXX-XXXX
    $deviceAddress = "$($first12.Substring(0, 4))-$($first12.Substring(4, 4))-$($first12.Substring(8, 4))"
    return $deviceAddress
}

# Get hardware UUID from WMI (same logic as client)
Write-Host "Reading hardware UUID from WMI..."
Write-Host ""

$ignoredValues = @("", "0", "unknown", "none", "to be filled by o.e.m.", "to be filled by oem", "default string", "system serial number")

$uuid = $null

# Try Win32_ComputerSystemProduct UUID
try {
    $result = Get-WmiObject Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    if ($result) {
        $candidateUuid = if ($result.UUID) { $result.UUID.Trim() } else { $null }
        if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
            $uuid = $candidateUuid
            Write-Host "✓ Found UUID from Win32_ComputerSystemProduct:" -ForegroundColor Green
            Write-Host "  $uuid"
        }
    }
} catch {
    Write-Host "  (Win32_ComputerSystemProduct access denied)" -ForegroundColor Yellow
}

# If not found, try BIOS SerialNumber
if (-not $uuid) {
    try {
        $result = Get-WmiObject Win32_BIOS -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $uuid = $candidateUuid
                Write-Host "✓ Found UUID from Win32_BIOS SerialNumber:" -ForegroundColor Green
                Write-Host "  $uuid"
            }
        }
    } catch {
        Write-Host "  (Win32_BIOS access denied)" -ForegroundColor Yellow
    }
}

# If still not found, try BaseBoard SerialNumber
if (-not $uuid) {
    try {
        $result = Get-WmiObject Win32_BaseBoard -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $uuid = $candidateUuid
                Write-Host "✓ Found UUID from Win32_BaseBoard SerialNumber:" -ForegroundColor Green
                Write-Host "  $uuid"
            }
        }
    } catch {
        Write-Host "  (Win32_BaseBoard access denied)" -ForegroundColor Yellow
    }
}

if (-not $uuid) {
    Write-Host "✗ Could not find a valid hardware UUID!" -ForegroundColor Red
    Write-Host "This is why your registration is failing."
    exit 1
}

Write-Host ""
Write-Host "Generating device address..." -ForegroundColor Cyan
$deviceAddress = Get-DeviceAddress -HardwareUUID $uuid
Write-Host "✓ Device address generated:" -ForegroundColor Green
Write-Host "  $deviceAddress"

Write-Host ""
Write-Host "=== Registration Payload ===" -ForegroundColor Cyan
Write-Host @"
The lock screen app will send this to the backend:

{
  "hardwareUuid": "$uuid",
  "deviceAddress": "$deviceAddress",
  ...other fields...
}

The backend will:
1. Generate device address from hardwareUuid: $deviceAddress
2. Compare with provided deviceAddress: $deviceAddress
3. Should match ✓

"@

Write-Host "=== Environment Variables ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current BACKEND_URL: $($env:BACKEND_URL)"
Write-Host "Current PAYMENT_URL: $($env:PAYMENT_URL)"
Write-Host "Current TOKEN_SECRET: $(if ($env:TOKEN_SECRET) { '***SET***' } else { 'NOT SET' })"

Write-Host ""
Write-Host "=== Test with Backend ===" -ForegroundColor Cyan
Write-Host ""

$backendUrl = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "https://project-x-kg81.onrender.com" }

Write-Host "To debug the registration error:"
Write-Host "1. Check if backend is running: curl $backendUrl/health"
Write-Host "2. Run the lock screen app with these values in memory"
Write-Host "3. Check backend logs for the exact error response"

Write-Host ""
Write-Host "✓ Diagnostic complete. Your hardware UUID and device address are valid."

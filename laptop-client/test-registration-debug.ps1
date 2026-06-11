#!/usr/bin/env pwsh
<#
.SYNOPSIS
Tests device registration against the backend to identify mismatch issues.

.DESCRIPTION
This script tests the device address validation without attempting full registration.
It helps identify if there's a mismatch between client and backend calculations.

.EXAMPLE
.\test-registration-debug.ps1

.EXAMPLE
.\test-registration-debug.ps1 -BackendUrl "http://localhost:3000"
#>

param(
    [string]$BackendUrl = $(if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "https://project-x-kg81.onrender.com" })
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Device Registration Diagnostic ===" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl"
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

# Get hardware UUID
$ignoredValues = @("", "0", "unknown", "none", "to be filled by o.e.m.", "to be filled by oem", "default string", "system serial number")
$uuid = $null

try {
    $result = Get-WmiObject Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    if ($result) {
        $candidateUuid = if ($result.UUID) { $result.UUID.Trim() } else { $null }
        if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
            $uuid = $candidateUuid
        }
    }
} catch {}

if (-not $uuid) {
    try {
        $result = Get-WmiObject Win32_BIOS -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $uuid = $candidateUuid
            }
        }
    } catch {}
}

if (-not $uuid) {
    try {
        $result = Get-WmiObject Win32_BaseBoard -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $uuid = $candidateUuid
            }
        }
    } catch {}
}

if (-not $uuid) {
    Write-Host "✗ Could not find a valid hardware UUID!" -ForegroundColor Red
    exit 1
}

$deviceAddress = Get-DeviceAddress -HardwareUUID $uuid

Write-Host "Hardware UUID: $uuid"
Write-Host "Device Address (local): $deviceAddress"
Write-Host ""

# Test with backend diagnostic endpoint
Write-Host "Testing with backend..." -ForegroundColor Cyan
Write-Host ""

$payload = @{
    hardwareUuid = $uuid
    deviceAddress = $deviceAddress
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/v1/debug/device-address" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $payload `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json

    Write-Host "Backend Response:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Generated Address: $($result.generatedDeviceAddress)"
    Write-Host "Provided Address:  $($result.providedDeviceAddress)"
    Write-Host "Match Status:      $(if ($result.matches) { "✓ MATCH" } else { "✗ MISMATCH" })"
    Write-Host ""

    if ($result.matches) {
        Write-Host "✓ Device addresses match - registration should succeed!" -ForegroundColor Green
    } else {
        Write-Host "✗ Device addresses DO NOT match - registration will fail!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Debug Info:" -ForegroundColor Yellow
        Write-Host "  Generated: $($result.debug.generatedAddressUpperCase) (len: $($result.debug.generatedLength))"
        Write-Host "  Provided:  $($result.debug.providedAddressUpperCase) (len: $($result.debug.providedLength))"
    }
}
catch {
    Write-Host "✗ Backend test failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host ""
    
    # Try basic health check
    Write-Host "Checking backend health..." -ForegroundColor Yellow
    try {
        $healthResponse = Invoke-WebRequest -Uri "$BackendUrl/health" -ErrorAction Stop
        Write-Host "✓ Backend is online"
    }
    catch {
        Write-Host "✗ Backend is not responding"
        Write-Host ""
        Write-Host "Possible issues:"
        Write-Host "1. Backend is offline"
        Write-Host "2. Backend URL is incorrect: $BackendUrl"
        Write-Host "3. Network connectivity issue"
    }
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. If addresses match: Try registration in the lock screen app"
Write-Host "2. If addresses don't match: Check if hardware UUID is being read correctly"
Write-Host "3. If backend unreachable: Check BACKEND_URL environment variable"
Write-Host "4. Run: .\test-hardware-fingerprint.ps1 for more details"

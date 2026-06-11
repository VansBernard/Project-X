$ErrorActionPreference = 'Stop'

Write-Host "=== Hardware Fingerprinting Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

function Get-DeviceAddress {
    param([string]$HardwareUUID)
    
    if ([string]::IsNullOrWhiteSpace($HardwareUUID)) {
        throw "Hardware UUID is required"
    }
    
    $normalized = $HardwareUUID.Trim().ToUpperInvariant()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha256.ComputeHash($bytes)
    $hashHex = [System.BitConverter]::ToString($hash) -replace '-', ''
    $sha256.Dispose()
    
    $first12 = $hashHex.Substring(0, 12)
    $deviceAddress = "$($first12.Substring(0, 4))-$($first12.Substring(4, 4))-$($first12.Substring(8, 4))"
    return $deviceAddress
}

Write-Host "Reading hardware UUID from WMI..."
Write-Host ""

$ignoredValues = @("", "0", "unknown", "none", "to be filled by o.e.m.", "to be filled by oem", "default string", "system serial number")
$uuid = $null

try {
    $result = Get-WmiObject Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    if ($result) {
        $candidateUuid = if ($result.UUID) { $result.UUID.Trim() } else { $null }
        if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
            $uuid = $candidateUuid
            Write-Host "Found UUID from Win32_ComputerSystemProduct:" -ForegroundColor Green
            Write-Host "  $uuid"
        }
    }
} catch {
    Write-Host "  (Win32_ComputerSystemProduct access denied)" -ForegroundColor Yellow
}

if (-not $uuid) {
    try {
        $result = Get-WmiObject Win32_BIOS -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $uuid = $candidateUuid
                Write-Host "Found UUID from Win32_BIOS SerialNumber:" -ForegroundColor Green
                Write-Host "  $uuid"
            }
        }
    } catch {
        Write-Host "  (Win32_BIOS access denied)" -ForegroundColor Yellow
    }
}

if (-not $uuid) {
    try {
        $result = Get-WmiObject Win32_BaseBoard -ErrorAction SilentlyContinue
        if ($result) {
            $candidateUuid = if ($result.SerialNumber) { $result.SerialNumber.Trim() } else { $null }
            if ($candidateUuid -and $ignoredValues -notcontains $candidateUuid.ToLower()) {
                $uuid = $candidateUuid
                Write-Host "Found UUID from Win32_BaseBoard SerialNumber:" -ForegroundColor Green
                Write-Host "  $uuid"
            }
        }
    } catch {
        Write-Host "  (Win32_BaseBoard access denied)" -ForegroundColor Yellow
    }
}

if (-not $uuid) {
    Write-Host "ERROR: Could not find a valid hardware UUID!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Generating device address..." -ForegroundColor Cyan
$deviceAddress = Get-DeviceAddress -HardwareUUID $uuid
Write-Host "Device address:" -ForegroundColor Green
Write-Host "  $deviceAddress"

Write-Host ""
Write-Host "=== Registration Payload ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "hardwareUuid: $uuid"
Write-Host "deviceAddress: $deviceAddress"

Write-Host ""
Write-Host "SUCCESS! Your hardware UUID and device address are valid." -ForegroundColor Green

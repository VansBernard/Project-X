Write-Host "=== Device Address Calculation Test ===" -ForegroundColor Cyan
Write-Host ""

# Your UUID
$uuid = "4C4C4544-0058-5810-8036-B4C04F4A5A32"
Write-Host "Input UUID: $uuid"
Write-Host ""

# Normalize
$normalized = $uuid.Trim().ToUpperInvariant()
Write-Host "Step 1 - Normalize to uppercase:"
Write-Host "  Result: $normalized"
Write-Host ""

# Calculate SHA256
$bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hash = $sha256.ComputeHash($bytes)
$sha256.Dispose()

# Convert to hex
$hashHex = [System.BitConverter]::ToString($hash) -replace '-', ''
Write-Host "Step 2 - SHA256 hash (full):"
Write-Host "  $hashHex"
Write-Host "  Length: $($hashHex.Length) characters"
Write-Host ""

# Get first 12 chars
$first12 = $hashHex.Substring(0, 12)
Write-Host "Step 3 - Extract first 12 hex characters:"
Write-Host "  Result: $first12"
Write-Host ""

# Split into groups
$g1 = $first12.Substring(0, 4)
$g2 = $first12.Substring(4, 4)
$g3 = $first12.Substring(8, 4)

Write-Host "Step 4 - Split into 3 groups of 4:"
Write-Host "  Group 1: $g1"
Write-Host "  Group 2: $g2"
Write-Host "  Group 3: $g3"
Write-Host ""

# Join with dashes
$deviceAddress = "$g1-$g2-$g3"
Write-Host "Step 5 - Join with dashes:"
Write-Host "  Final Device Address: $deviceAddress"
Write-Host ""

Write-Host "=== Result ===" -ForegroundColor Green
Write-Host "Device Address: $deviceAddress"
Write-Host ""
Write-Host "This is what the .NET client should generate."
Write-Host "This is what the backend should validate against."

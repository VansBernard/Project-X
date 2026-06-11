# Device Registration Error Troubleshooting

## Error: "Device address does not match the hardware UUID"

This error occurs when the lock screen app sends a `hardwareUuid` and `deviceAddress` that don't match according to the backend's calculation.

---

## Quick Diagnosis

Run these scripts in order:

### Step 1: Check Your Hardware UUID
```powershell
cd "c:\Users\ASUS\Documents\Project X\laptop-client"
.\test-hardware-fingerprint.ps1
```

This shows:
- What hardware UUID your machine generates
- What device address gets calculated
- Expected registration payload

**Expected output:**
```
✓ Found UUID from Win32_ComputerSystemProduct: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
✓ Device address generated: XXXX-XXXX-XXXX
```

### Step 2: Test Backend Address Generation
```powershell
.\test-registration-debug.ps1
```

This sends your hardware UUID to the backend and checks if it generates the same device address.

**Expected output:**
```
Generated Address: XXXX-XXXX-XXXX
Provided Address:  XXXX-XXXX-XXXX
Match Status:      ✓ MATCH
```

---

## Common Issues & Solutions

### Issue 1: "Could not find a valid hardware UUID!"
**Cause:** Your laptop doesn't have a readable BIOS UUID

**Solution:**
```powershell
# Manually set a hardware UUID
$env:PROJECTX_HARDWARE_UUID = "MY-CUSTOM-UUID-12345"

# Then run the lock screen app with this UUID set
```

### Issue 2: Backend Not Found / Network Error
**Cause:** Backend is offline or URL is wrong

**Solution:**
```powershell
# Check current backend URL
$env:BACKEND_URL

# Test if backend is online
curl "https://project-x-kg81.onrender.com/health"

# For local testing, set:
$env:BACKEND_URL = "http://localhost:3000"
$env:PAYMENT_URL = "http://localhost:3000"
```

### Issue 3: Addresses Don't Match
**Cause:** Different SHA256 implementations or data corruption

**Potential fixes:**
1. Ensure both client and backend use the same algorithm (they should)
2. Check if hardware UUID is being corrupted during transmission
3. Verify backend code is up-to-date

---

## How Device Address Validation Works

### Client Side (.NET)
```csharp
var hardwareUuid = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"  // from WMI
var normalized = hardwareUuid.Trim().ToUpperInvariant()
var sha256Hash = SHA256(normalized)
var first12Hex = sha256Hash.Substring(0, 12)
var deviceAddress = $"{first12Hex[0:4]}-{first12Hex[4:8]}-{first12Hex[8:12]}"
// Result: "XXXX-XXXX-XXXX"
```

### Server Side (Node.js)
```javascript
const normalized = hardwareUUID.trim().toUpperCase()
const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').substring(0, 12)
const deviceAddress = `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`
// Result: "XXXX-XXXX-XXXX"
```

Both should produce identical results.

---

## Debug Environment Variables

Set these before running the lock screen app to enable detailed logging:

```powershell
# Use local backend instead of deployed
$env:BACKEND_URL = "http://localhost:3000"

# Manually set a consistent hardware UUID (optional)
$env:PROJECTX_HARDWARE_UUID = "test-uuid-123"

# Load .env file from parent directory (debug only)
$env:PROJECTX_USE_ENV_FILE = "true"

# Check logs
Get-Content "$env:LOCALAPPDATA\ProjectX\LaptopClient\Logs\client.log" -Tail 50
```

---

## Testing Registration Without the App

You can test the device address validation endpoint directly:

```powershell
$payload = @{
    hardwareUuid = "YOUR-HARDWARE-UUID-HERE"
    deviceAddress = "XXXX-XXXX-XXXX"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://project-x-kg81.onrender.com/api/v1/debug/device-address" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $payload
```

**Response example:**
```json
{
  "hardwareUuid": "XXXXXXXX-...",
  "generatedDeviceAddress": "XXXX-XXXX-XXXX",
  "providedDeviceAddress": "XXXX-XXXX-XXXX",
  "matches": true,
  "matchesExplanation": "Device addresses match - registration should succeed"
}
```

---

## If Still Failing

1. **Run diagnostics:**
   ```powershell
   .\test-hardware-fingerprint.ps1
   .\test-registration-debug.ps1
   ```

2. **Save the output** and share what you see

3. **Check backend logs** (if self-hosted):
   ```bash
   npm logs backend
   ```

4. **Restart backend** (sometimes there are cached values):
   ```bash
   npm restart backend
   ```

---

## Root Cause Checklist

- [ ] Hardware UUID is being read (test-hardware-fingerprint.ps1)
- [ ] Device address is generated consistently (test-registration-debug.ps1)
- [ ] Backend is online and responding (curl /health)
- [ ] Backend code matches client code (same SHA256 algorithm)
- [ ] No special characters in hardware UUID
- [ ] Backend recently redeployed (if using Render)

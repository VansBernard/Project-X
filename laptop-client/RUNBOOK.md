# LockScreenApp Operational Runbook

## Quick Reference

| Task | Location |
|------|----------|
| Client logs | `%LOCALAPPDATA%\ProjectX\LaptopClient\Logs\client.log` |
| Encrypted data | Registry: `HKEY_CURRENT_USER\Software\ProjectX\LaptopClient` |
| Source code | `laptop-client\LockScreenApp\` |
| Build output | `laptop-client\LockScreenApp\bin\Release\` |

## Daily Operations

### Monitoring
Check for critical errors in:
```powershell
Get-Content "$env:LOCALAPPDATA\ProjectX\LaptopClient\Logs\client.log" -Tail 50
```

Monitor these events:
- Registration failures
- Unlock code verification failures
- Missing TOKEN_SECRET or other secrets

### Health Check
Verify the app can:
1. Connect to the backend API
2. Read TOKEN_SECRET from the environment
3. Write to the local registry (for deadline storage)

## Incident Response

### Symptom: Users cannot unlock devices

**Step 1: Verify environment configuration**
```powershell
$env:TOKEN_SECRET
$env:BACKEND_URL
```

**Step 2: Check client logs**
```powershell
Get-Content "$env:LOCALAPPDATA\ProjectX\LaptopClient\Logs\client.log"
```

**Step 3: Verify the unlock code**
- Have the user re-enter the code (8 digits)
- Check that the code was sent to the correct email/phone

**Step 4: Check backend logs**
- Verify the code was generated correctly
- Confirm the device is registered

**Resolution**: Update `TOKEN_SECRET` if expired, or regenerate unlock codes.

---

### Symptom: LockScreenApp won't start

**Step 1: Verify .NET Runtime**
```powershell
dotnet --version
```
Must be .NET 8.0 or later.

**Step 2: Check registry permissions**
The user must have write access to:
```
HKEY_CURRENT_USER\Software\ProjectX\LaptopClient
```

**Step 3: Check file permissions**
The user must have write access to:
```
%LOCALAPPDATA%\ProjectX\LaptopClient\Logs\
%LOCALAPPDATA%\ProjectX\LaptopClient\Secure\
```

**Resolution**: Reset registry permissions or reinstall the app.

---

### Symptom: Lockscreen can be bypassed with keyboard shortcuts

**Cause**: Keyboard hook installation failed or hardening was disabled.

**Fix**: Restart the application or reinstall.

---

## Secret Rotation

### TOKEN_SECRET Rotation Process

1. **Generate a new secret**:
   ```powershell
   $newSecret = [convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random 256) }))
   Write-Host $newSecret
   ```

2. **Update in all environments**:
   - Development: Update `.env`
   - Production: Update system environment variables on all machines
   ```powershell
   [System.Environment]::SetEnvironmentVariable("TOKEN_SECRET", $newSecret, "Machine")
   ```

3. **Restart affected applications**:
   - Restart LockScreenApp instances
   - Restart backend server

4. **Update backend code generation** (if signing keys have changed):
   - Regenerate unlock codes with the new secret
   - Notify users if previously generated codes become invalid

5. **Monitor for errors**:
   - Check logs for verification failures
   - Verify unlock codes work as expected

---

## Deployment Checklist

### Pre-Release
- [ ] All tests pass locally and in CI
- [ ] Security scan shows no critical vulnerabilities
- [ ] Code review completed
- [ ] CHANGELOG updated with version notes
- [ ] Signing certificate is valid and non-expired
- [ ] Installer is digitally signed

### Release
- [ ] Build signed MSI installer
- [ ] Test installer on clean Windows environment
- [ ] Verify TOKEN_SECRET and other secrets are set in deployment
- [ ] Deploy to staging environment first
- [ ] Test end-to-end: registration → payment → unlock
- [ ] Announce release to users

### Post-Release
- [ ] Monitor logs for errors
- [ ] Verify unlock code success rate
- [ ] Check for registration failures
- [ ] Monitor lockscreen bypass attempts

---

## Common Tasks

### View all logs
```powershell
Get-ChildItem "$env:LOCALAPPDATA\ProjectX\LaptopClient\Logs\" | Sort-Object LastWriteTime -Descending
```

### Get device hardware UUID (for testing)
```bash
cd laptop-client\TokenVerifier
dotnet run -- --print-hardware
```

### Manually set deadline (for testing)
```bash
dotnet run -- --set-deadline 2025-12-31
```

### Check lock status
```bash
dotnet run -- --status
```

### Verify an unlock code (testing)
```bash
dotnet run -- --year 2025 --month 12 --code 12345678
```

---

## Contacts & Escalation

| Issue | Contact | Link |
|-------|---------|------|
| Registration/Payment failures | Backend team | Check `backend/` logs |
| UI/Lockscreen issues | Client team | Check `laptop-client/LockScreenApp/` |
| Deployment / Infrastructure | DevOps | GitHub Actions pipeline |
| Security incident | Security team | Report immediately |

---

## Additional Resources

- **Client Development**: [laptop-client/README.md](./README.md)
- **Production Setup**: [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)
- **Backend API**: [backend/README.md](../backend/README.md)
- **Architecture**: [ARCHITECTURE.md](../ARCHITECTURE.md)

# StartupAgent

Runs in the user session and launches `LockScreenApp` when the stored access deadline is expired or missing.

This is the first startup layer. It uses the current user's Windows startup registry key:

```text
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
```

## Commands

Build:

```powershell
dotnet build
```

Check status:

```powershell
dotnet run -- --status
```

Run one check:

```powershell
dotnet run -- --run-once
```

Install startup for this Windows user:

```powershell
dotnet run -- --install-startup
```

Remove startup:

```powershell
dotnet run -- --uninstall-startup
```

Production note: a hardened version should install a service or scheduled task with admin permissions, protect config/secrets, and prevent users from disabling the agent.

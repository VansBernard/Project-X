# Project X - Directory Structure

## Clean Project Layout

```
Project X/
│
├── 📁 backend/                          # Node.js API Server (MAIN)
│   ├── index.js                         # Express server entry point
│   ├── db.js                            # Database connection & queries
│   ├── migrate.js                       # Database schema migrations
│   ├── create_db.js                     # Database initialization
│   ├── scripts.js                       # Utility scripts
│   ├── test-email.js                    # Email testing utility
│   │
│   ├── 📁 test/                         # Test suites
│   │   ├── validation.test.js
│   │   ├── deviceStatus.test.js
│   │   ├── paystackWebhook.test.js
│   │   ├── timeToken.test.js
│   │   └── dbHelper.js                  # Test database helpers
│   │
│   ├── 📁 utils/                        # Shared utilities
│   │   ├── logger.js                    # Logging module
│   │   ├── notifications.js             # Email/SMS notifications
│   │   ├── timeToken.js                 # Token generation & validation
│   │   └── validation.js                # Input validation schemas
│   │
│   ├── package.json                     # Node dependencies & scripts
│   ├── package-lock.json                # Locked dependency versions
│   ├── .env.example                     # Environment template
│   ├── .env                             # Local env (not committed)
│   ├── .gitignore                       # Git ignore rules
│   ├── DEPLOYMENT.md                    # Deployment instructions
│   └── SECRET_ROTATION.md               # Security best practices
│
├── 📁 web/                              # Payment Web Interface (STATIC)
│   ├── index.html                       # Main payment page
│   ├── styles.css                       # Styling
│   └── scripts.js                       # Frontend logic (QR, payments)
│                                        # Note: Integrate with backend API
│
├── 📁 laptop-client/                    # C# Windows Desktop App
│   ├── 📄 PRODUCTION_GUIDE.md          # Windows app deployment guide
│   ├── 📄 README.md                     # App documentation
│   ├── 📄 REGISTRATION_TROUBLESHOOTING.md
│   ├── 📄 RUNBOOK.md                    # Operational guide
│   │
│   ├── 📁 LockScreenApp/                # Main WPF Application
│   │   ├── App.xaml                     # WPF app definition
│   │   ├── App.xaml.cs                  # App code-behind
│   │   ├── MainWindow.xaml              # Lock screen UI
│   │   ├── MainWindow.xaml.cs           # Lock screen logic
│   │   ├── LockScreenApp.csproj         # Project file
│   │   ├── ClientLogger.cs              # Logging module
│   │   ├── SecureStorage.cs             # Encrypted local storage
│   │   ├── bin/                         # Build output
│   │   └── obj/                         # Compiled objects
│   │
│   ├── 📁 StartupAgent/                 # Background Service
│   │   ├── Program.cs                   # Service entry point
│   │   ├── StartupAgent.csproj
│   │   ├── bin/
│   │   └── obj/
│   │
│   ├── 📁 TokenVerifier/                # Device Registration & Verification
│   │   ├── Program.cs                   # Main entry point
│   │   ├── OfflineToken.cs              # Local token management
│   │   ├── HardwareFingerprint.cs       # Device UUID generation
│   │   ├── RegistrationStore.cs         # Local device data storage
│   │   ├── SecureRegistry.cs            # Windows registry management
│   │   ├── DeadlineStore.cs             # Expiry tracking
│   │   ├── TokenVerifier.csproj
│   │   ├── bin/
│   │   └── obj/
│   │
│   ├── 📁 installer/                    # WiX Installer Package
│   │   ├── ProjectXLockScreenInstaller.wxs
│   │   ├── validate-installer.ps1
│   │   └── (build outputs .msi)
│   │
│   ├── 📁 tests/                        # Unit tests
│   │   └── LockScreenApp.Tests/
│   │
│   ├── 📁 bin/                          # Build output
│   └── 📁 obj/                          # Compiled objects
│
├── 📁 docs/                             # Documentation & Deployment Config
│   ├── ARCHITECTURE.md                  # System design & flow
│   ├── DEPLOYMENT.md                    # Deployment guides
│   ├── MIGRATION_GUIDE.md               # Database migration steps
│   ├── SCHEMA_INTEGRATION_GUIDE.md      # Schema integration
│   ├── SECRET_ROTATION.md               # Security & secrets
│   ├── render.yaml                      # Render deployment config
│   ├── 001_initial_schema.sql           # Database schema v1
│   └── 002_release_flow.sql             # Release flow schema
│
├── 📄 README.md                         # Project overview
├── 📄 SETUP_GUIDE.md                    # Development setup guide
├── 📄 .gitignore                        # Git configuration
├── 📄 .env.example                      # Root env template (if needed)
├── 📄 .env                              # Local env vars (not committed)
│
└── 🔧 Configuration Files
    ├── .github/                         # GitHub workflows & config
    ├── .git/                            # Git repository
    ├── remove_env_git.ps1               # Utility script
    └── package-lock.json                # (from earlier backend setup)


## What Was Cleaned Up

### ❌ Deleted Duplicate Files
These were removed from root (they exist in backend/):
- 001_initial_schema.sql
- 002_release_flow.sql
- create_db.js
- db.js
- dbHelper.js
- deviceStatus.test.js
- index.html
- index.js
- logger.js
- migrate.js
- notifications.js
- paystackWebhook.test.js
- package.json
- package-lock.json
- scripts.js
- styles.css
- test-email.js
- timeToken.js
- timeToken.test.js
- validation.js
- validation.test.js

### ❌ Deleted Backup Folders
- deploy/ (was backup copy of backend)
- moved render.yaml to docs/

### ✅ Consolidated Documentation
All docs moved to `docs/` folder:
- ARCHITECTURE.md
- DEPLOYMENT.md
- DEPLOY_RENDER.md
- MIGRATION_GUIDE.md
- SCHEMA_INTEGRATION_GUIDE.md
- SECRET_ROTATION.md

## Key Points

1. **Single Source of Truth**: Each component has ONE main copy:
   - Backend: `backend/`
   - Web UI: `web/`
   - Windows Client: `laptop-client/`

2. **No More Duplicates**: The `deploy/` folder that had copies is gone

3. **Organized Documentation**: All docs in `docs/` folder for easy access

4. **Clear Separation of Concerns**:
   - API backend handles business logic
   - Web UI is static (customer-facing payments)
   - Windows client is the main app (owner installation)
   - Docs are comprehensive guides

## How to Push to GitHub

```bash
# Stage changes
git add .

# Commit
git commit -m "Restructure: Clean up duplicates and consolidate to single source of truth"

# Push
git push origin main
```

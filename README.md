# Project-X: Pay-As-You-Go Lock Screen Payment System

A comprehensive solution for device owners to generate pay-as-you-go lock screens on Windows laptops, enabling customers to scan QR codes and make payments through a web interface.

## 📁 Project Structure

```
Project-X/
├── backend/                    # Node.js API Server
│   ├── src/                   # Application source code
│   │   ├── index.js          # Express server entry point
│   │   ├── db.js             # Database connection & queries
│   │   ├── migrate.js        # Database schema migrations
│   │   ├── create_db.js      # Database initialization
│   │   └── scripts.js        # Utility scripts
│   ├── test/                 # Test suites
│   ├── utils/                # Shared utilities
│   │   ├── logger.js         # Logging module
│   │   ├── notifications.js  # Email/notification service
│   │   ├── timeToken.js      # Token generation & validation
│   │   └── validation.js     # Input validation
│   ├── package.json          # Node dependencies
│   └── .env.example          # Environment variables template
│
├── web/                       # Payment Web Interface
│   ├── index.html            # Main payment page
│   ├── styles.css            # Styling
│   └── scripts.js            # Frontend logic (QR scanning, payments)
│
├── laptop-client/            # C# Windows Desktop App
│   ├── LockScreenApp/        # Main lock screen application
│   │   ├── App.xaml          # WPF application definition
│   │   ├── MainWindow.xaml   # Lock screen UI
│   │   └── ClientLogger.cs   # Client-side logging
│   ├── StartupAgent/         # Background startup service
│   │   └── Program.cs        # Service entry point
│   ├── TokenVerifier/        # Device registration & token validation
│   │   ├── OfflineToken.cs   # Offline token management
│   │   ├── HardwareFingerprint.cs  # Device identification
│   │   └── RegistrationStore.cs    # Local device data storage
│   └── installer/            # WiX installer package
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # System design & flow
│   ├── DEPLOYMENT.md         # Deployment guides
│   ├── MIGRATION_GUIDE.md    # Database migration steps
│   ├── SCHEMA_INTEGRATION_GUIDE.md
│   └── *.sql                 # Database schema files
│
├── .gitignore               # Git ignore rules
├── .env.example             # Root-level env template (if needed)
└── package-lock.json        # Dependency lock file (from backend/)

```

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run migrate        # Run database migrations
npm run dev           # Start development server (port 5000)
```

### Web UI
The web interface is a static HTML/CSS/JS application:
- Serve from `web/` folder via any HTTP server
- Customers access via QR code from lock screen
- Integrates with Paystack for payments

### Windows Client Setup
- Navigate to `laptop-client/`
- Open in Visual Studio
- Build the installer or run directly

## 🔑 Key Features

1. **Device Registration**
   - Owners install Windows app and fill device details
   - System generates unique device address
   - Device address used as QR code on lock screen

2. **Payment Flow**
   - Customers scan QR code from lock screen
   - Opens web payment interface
   - Selects payment amount
   - Completes Paystack payment
   - Device verifies payment and unlocks screen

3. **Backend Services**
   - Device registration & authentication
   - QR code generation
   - Payment verification with Paystack
   - Email notifications for transactions
   - Token generation & validation

## 📊 Database

All database setup is automated:
```bash
cd backend
npm run migrate    # Creates schema and initializes DB
```

## 🔐 Environment Variables

Create `.env` files in:
- `backend/.env` - API server configuration
- Set required variables for DB, Paystack API keys, email, etc.

See `.env.example` files for templates.

## 🧪 Testing

```bash
cd backend
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
```

## 📦 Deployment

Deployment guides available in `docs/DEPLOYMENT.md`

## 🛠️ Development

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: Vanilla JS + HTML/CSS + Paystack SDK
- **Desktop**: C# + WPF (Windows only)

## 📝 License

Private Project


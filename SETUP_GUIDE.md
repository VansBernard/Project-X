# Project X - Setup & Development Guide

## Prerequisites
- **Node.js** 18+ (backend)
- **PostgreSQL** 12+ (database)
- **.NET 6+** (Windows client)
- **Visual Studio 2022** (for C# development)
- **npm** or **yarn** (package manager)

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Database
Create `.env` file in `backend/` folder:
```bash
# Copy from example
cp .env.example .env

# Edit .env with your database credentials
DATABASE_URL=postgresql://user:password@localhost:5432/project_x
DATABASE_SSL=false
```

### 3. Initialize Database
```bash
# Create database schema
npm run migrate

# Or manually run SQL files in docs/
```

### 4. Start Development Server
```bash
npm run dev
# Server starts on http://localhost:5000
```

### 5. Run Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration
```

## Web Interface Setup

### 1. Serve Static Files
The web folder contains the payment UI. Serve it from any HTTP server:

```bash
# Option 1: Using Python
python -m http.server 3000 -d web

# Option 2: Using Node.js http-server
npx http-server web -p 3000

# Option 3: Using Express (see backend integration)
```

### 2. Configure for Backend API
Edit `web/scripts.js`:
```javascript
const API_BASE = 'http://localhost:5000';
```

## Windows Client Setup

### 1. Open in Visual Studio
```
File → Open → Project/Solution
Navigate to: laptop-client/
Open: LockScreenApp.sln
```

### 2. Build
```
Build → Build Solution (Ctrl+Shift+B)
```

### 3. Test Locally
```
Debug → Start Debugging (F5)
```

### 4. Create Installer
```
Right-click installer/ → Properties
Update product version if needed

Build the WiX project to generate .msi
```

## Environment Variables

### Backend (.env)
```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/project_x
DATABASE_SSL=false

# API
PORT=5000
NODE_ENV=development

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# JWT
JWT_SECRET=your_jwt_secret_key
```

## Project Architecture

```
┌─────────────────────────────────────────────┐
│         Customer's Laptop                   │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Windows Lock Screen App (C#/WPF)    │  │
│  │  - Displays QR code                  │  │
│  │  - Shows device status               │  │
│  │  - Offline payment verification      │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              │
              │ (scan QR → opens browser)
              ▼
┌─────────────────────────────────────────────┐
│    Customer's Web Browser                   │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Payment Web UI (HTML/CSS/JS)        │  │
│  │  - Input payment amount              │  │
│  │  - Paystack integration              │  │
│  │  - Payment confirmation              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              │
              │ (HTTPS)
              ▼
┌─────────────────────────────────────────────┐
│    Project X Backend (Node.js)              │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Express API Server                  │  │
│  │  - Device registration               │  │
│  │  - Payment verification (Paystack)   │  │
│  │  - Token validation                  │  │
│  │  - Email notifications               │  │
│  └──────────────────────────────────────┘  │
│              │                              │
│              ▼                              │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL Database                 │  │
│  │  - Devices, Transactions, Tokens     │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Key API Endpoints

### Device Registration
```
POST /api/devices/register
Body: { name, email, phone, ... }
Returns: { deviceId, deviceAddress, qrCode }
```

### Payment Verification
```
POST /api/payments/verify
Body: { deviceAddress, paymentRef, amount }
Returns: { success, unlockToken }
```

### Device Unlock
```
POST /api/devices/unlock
Body: { deviceId, unlockToken }
Returns: { authorized: true/false }
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check port 5000 is not in use: `lsof -i :5000`

### Database migration fails
- Ensure PostgreSQL is accessible
- Check credentials in .env
- Try manually running SQL: `psql -U user -d project_x -f docs/*.sql`

### Windows app won't register
- Ensure backend is running and accessible
- Check network connectivity
- Review logs in `C:\Users\{user}\AppData\Local\Project X/`

## Deployment

See `docs/DEPLOYMENT.md` for production deployment instructions.

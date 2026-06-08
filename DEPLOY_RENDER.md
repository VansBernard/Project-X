# Project X Render Deployment Guide

This guide deploys the Node/Express backend and the `Web` payment page together on Render.

## 1. Prepare GitHub

1. Create a GitHub repository.
2. Push this whole project folder to GitHub.
3. Do **not** commit `backend/.env`; use Render environment variables instead.

Recommended commands:

```bash
git init
git add .
git commit -m "Prepare Project X for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Create Render Web Service

1. Go to `https://render.com`.
2. Click **New +**.
3. Choose **Web Service**.
4. Connect your GitHub repository.
5. Use these settings:

```text
Name: project-x
Root Directory: backend
Runtime: Node
Build Command: npm ci
Start Command: npm start
```

Use **Web Service**, not **Static Site**. The backend serves the `Web` folder and handles Paystack webhooks.

## 3. Add Render Environment Variables

In Render, open your service → **Environment** and add:

```env
DATABASE_URL=your_supabase_pooler_connection_string
PGSSLMODE=require
PAYSTACK_SECRET=sk_test_or_live_xxx
PAYSTACK_PUBLIC_KEY=pk_test_or_live_xxx
PAYMENT_CURRENCY=GHS
PAYMENT_PAGE_URL=https://your-render-service-name.onrender.com
TOKEN_SECRET=replace_with_a_long_random_secret
EMAIL_ENABLED=false
EMAIL_FROM=Project X <no-reply@example.com>
SUPPORT_EMAIL=support@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smtp_username
SMTP_PASS=smtp_password
```

Notes:

- Use Supabase **pooler** connection string if the direct database host does not resolve.
- Do not wrap values in quotes in Render unless the value itself requires quotes.
- `PAYMENT_PAGE_URL` must match your Render public URL after deployment.
- Use Paystack test keys first, then switch to live keys after testing.

## 4. Deploy

1. Click **Create Web Service**.
2. Wait for Render to build and start the service.
3. Open:

```text
https://your-render-service-name.onrender.com/pay
```

## 5. Run Database Migrations

After the service is deployed, run migrations once from your computer:

```bash
cd backend
npm run migrate
```

Make sure your local `backend/.env` points to the same Supabase database used by Render.

If you prefer Render to run migrations, open Render Shell for the service and run:

```bash
npm run migrate
```

## 6. Add Paystack Webhook

In Paystack Dashboard:

1. Go to **Settings** → **API Keys & Webhooks**.
2. Add this webhook URL:

```text
https://your-render-service-name.onrender.com/api/v1/paystack-webhook
```

3. Save.

## 7. Test Full Flow

1. Register a test device with:

```bash
curl -X POST https://your-render-service-name.onrender.com/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "hardwareUuid": "test-hardware-001",
    "deviceName": "Test Laptop",
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "phoneNumber": "+233555000000",
    "totalContractAmount": 1200,
    "paymentFrequency": "Monthly",
    "paymentAmount": 100
  }'
```

2. Copy the returned `paymentUrl`.
3. Open the `paymentUrl` in your browser.
4. Pay with Paystack test card details.
5. Confirm Supabase updated `payment_history` and `financing_contracts`.

## 8. Important URLs

```text
Payment page:
https://your-render-service-name.onrender.com/pay

Health check:
https://your-render-service-name.onrender.com/health

Device registration API:
POST https://your-render-service-name.onrender.com/api/v1/devices/register

Paystack webhook:
POST https://your-render-service-name.onrender.com/api/v1/paystack-webhook
```


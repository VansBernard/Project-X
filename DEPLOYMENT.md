# Deployment and Secrets Injection

This file explains how to securely inject secrets into your production environment and how to remove local `.env` from the repository.

1) Remove local `.env` from the repository (one-time)

   Run locally in your git clone (not in this workspace):

   ```bash
   git rm --cached backend/.env
   git commit -m "Remove backend .env from repo"
   git push
   ```

   Then rotate any potentially exposed secrets (Paystack keys, DB credentials, SMTP password).

2) Use a secrets manager / platform-specific injection

   - AWS (recommended): use AWS Secrets Manager or SSM Parameter Store and provide IAM access to the deployment role.
     Example with ECS or EC2 launch configuration: reference secret as environment variable at runtime.

   - Kubernetes: create a `Secret` object and mount it as environment variables or files in the pod spec.

   - GitHub Actions / CI: store secrets in repository settings (Settings → Secrets) and inject them into workflow jobs.

   - Docker Compose (server-side): avoid committing `.env`; supply environment file at deploy time or use `docker secret`.

3) Local startup and smoke tests

   - Install dependencies in `backend`:
     ```bash
     cd backend
     npm install
     ```
   - Create a local `.env` from `backend/.env.example` with your development values.
   - Start the server:
     ```bash
     npm start
     ```
   - Verify the server is running and config is exposed:
     ```bash
     curl http://localhost:3000/health
     curl http://localhost:3000/api/v1/config
     ```
   - Verify the payment page works at:
     ```bash
     http://localhost:3000/pay?contractId=<id>&device=<device>&email=<email>
     ```
   - If you want to test email delivery, run:
     ```bash
     node test-email.js
     ```

4) Example: AWS Secrets Manager (high-level)

   - Create a secret named `projectx/backend` containing a JSON map of key/values (e.g., PAYSTACK_SECRET, TOKEN_SECRET, DATABASE_URL).
   - Grant the task/instance role permission to `secretsmanager:GetSecretValue`.
   - In your deployment, fetch secrets at startup or let the platform inject them as env vars.

4) GitHub to Render deployment workflow

   a) GitHub setup
   - Push your repository to GitHub and keep the following files:
     - `backend/index.js`
     - `backend/package.json`
     - `backend/package-lock.json`
     - `backend/.gitignore`
     - `backend/.env.example`
     - `Web/index.html`, `Web/scripts.js`, `Web/styles.css`
     - `render.yaml` at the repository root
   - Ensure `.gitignore` excludes `.env` and `backend/.env`.

   b) Render setup
   - Sign in to Render and connect your GitHub repository.
   - Render will detect `render.yaml` and use it to create the service.
   - If you create the service manually, use these values:
     - Service type: `Web Service`
     - Environment: `Node`
     - Root directory: `backend`
     - Build command: `npm ci`
     - Start command: `npm start`

   c) Environment variables (required)
   - Set these in the Render dashboard or use `render.yaml` with `sync: false`:
     - `DATABASE_URL`
     - `PAYSTACK_SECRET`
     - `PAYSTACK_PUBLIC_KEY`
     - `TOKEN_SECRET`
     - `PAYMENT_PAGE_URL` (set to the Render service URL, e.g. `https://project-x.onrender.com`)
     - `EMAIL_ENABLED` (true/false)
     - `EMAIL_FROM`
     - `SMTP_HOST`
     - `SMTP_PORT`
     - `SMTP_SECURE`
     - `SMTP_USER`
     - `SMTP_PASS`
     - `SUPPORT_EMAIL`
   - Keep secrets out of GitHub source; use Render's environment variable editor.

   d) Health check and live URL
   - After deploy, Render will provide a public URL.
   - Confirm the app health endpoint works:
     ```bash
     curl https://<your-render-service>.onrender.com/health
     ```
   - Confirm config endpoint works:
     ```bash
     curl https://<your-render-service>.onrender.com/api/v1/config
     ```

   e) Paystack webhook configuration
   - In Paystack dashboard, set the webhook endpoint to:
     ```text
     https://<your-render-service>.onrender.com/api/v1/paystack-webhook
     ```
   - Confirm `PAYSTACK_SECRET` on Render matches the Paystack webhook secret.

5) Example: AWS Secrets Manager (high-level)

   - Create a secret named `projectx/backend` containing a JSON map of key/values (e.g., PAYSTACK_SECRET, TOKEN_SECRET, DATABASE_URL).
   - Grant the task/instance role permission to `secretsmanager:GetSecretValue`.
   - In your deployment, fetch secrets at startup or let the platform inject them as env vars.

6) Rotating Paystack keys

   - In the Paystack dashboard, revoke the current secret and generate a new one.
   - Update the secret value in your secrets manager and deploy.
   - Monitor webhook deliveries and ensure `PAYSTACK_SECRET` used for webhook HMAC verification is updated.

5) Rotating SMTP credentials

   - If using a provider (Gmail, SendGrid), generate a new SMTP password or API key.
   - Update the secret store and redeploy.

6) CI deploy example (GitHub Actions)

   ```yaml
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy
           env:
             DATABASE_URL: ${{ secrets.DATABASE_URL }}
             PAYSTACK_SECRET: ${{ secrets.PAYSTACK_SECRET }}
             PAYSTACK_PUBLIC_KEY: ${{ secrets.PAYSTACK_PUBLIC_KEY }}
             TOKEN_SECRET: ${{ secrets.TOKEN_SECRET }}
           run: |
             # deploy commands here, which will see the env vars
             echo "Deploying with secrets injected"
   ```

7) Post-action checklist

   - Ensure `backend/.env` is not in the repo (use `git rm --cached` as above).
   - Rotate secrets if they were previously committed.
   - Document where each secret is stored and who has access.

If you want, I can prepare a `git` command list to remove the file from history (BFG or git filter-branch) — I will not run it without your approval.

# Secret Rotation & Storage Guide

This document describes recommended practices for generating, rotating, and storing secrets used by the backend (API keys, HMAC secrets, SMTP credentials, DB URLs).

1) Generate strong secrets
- Use a cryptographically strong random value for `TOKEN_SECRET`. Example:

  ```bash
  openssl rand -hex 32
  ```

- For API keys (Paystack) use the provider console to generate new keys; do not hand-roll tokens.

2) Short-term storage for development
- Keep a local `backend/.env` for development, but ensure it is listed in `.gitignore` and never committed.
- Use descriptive placeholders in `.env.example` and commit that file instead.

3) Production storage and rotation
- Use a secrets manager (one of):
  - AWS Secrets Manager / SSM Parameter Store
  - Azure Key Vault
  - Google Secret Manager
  - HashiCorp Vault
  - GitHub Actions / GitLab CI protected secrets for CI-only values

- Rotation policy:
  - Rotate `TOKEN_SECRET` at least annually or immediately if exposed.
  - Rotate `PAYSTACK_SECRET`/`PAYSTACK_PUBLIC_KEY` immediately if committed or leaked.
  - Rotate SMTP credentials if the account is shared or the password was exposed.

4) Deployment practices
- Inject secrets into the runtime environment via the platform (container secrets, systemd env, Kubernetes Secrets, cloud secret injections), not by committing `.env`.
- For CI/CD, store secrets in the CI provider and inject them as environment variables during deploy/test only.

5) Access control and auditing
- Use least-privilege service accounts for DB and email where supported.
- Enable multi-factor authentication on all accounts with admin access.
- Keep an access log and audit who requested key changes.

6) Emergency rotation steps (if leaked)
- Revoke the exposed key in the provider dashboard (Paystack, SMTP provider, DB provider).
- Generate new key, update the secret store, redeploy services that rely on it.
- Revoke any cached tokens and inspect logs for suspicious use.

7) Quick checklist for this repo
- Ensure `backend/.env` is ignored by git. If already committed, remove it from history and rotate secrets.
- Move production secrets to a secret manager and update deployment configuration to reference them.
- Keep `backend/.env.example` as the developer-facing template (no secrets).

If you want, I can:
- Remove `backend/.env` from the repository (or replace it with placeholders),
- Add a `.gitignore` entry to ignore `.env`,
- Provide exact AWS/GCP/Azure steps to store and fetch secrets during deployment.

---
Recommended immediate actions for you:
- Rotate Paystack keys if the current ones were posted to a public repository.
- Keep `TOKEN_SECRET` secret and consider storing it in a secrets manager.

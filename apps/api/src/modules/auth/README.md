# Authentication And Authorization

This module provides the Project X authentication foundation only.

## Roles

- Super Admin
- Dealer
- Sales Agent
- Customer

Roles are stored in `roles`. Permissions are stored in `permissions`. Role mappings are stored in `role_permissions`.

## Token Model

- Access tokens are JWTs signed with `JWT_ACCESS_SECRET`.
- Refresh tokens are JWTs signed with `JWT_REFRESH_SECRET`.
- Refresh token hashes are stored in `sessions`.
- Refresh tokens rotate on every refresh.
- Logout revokes the active refresh-token session.

## Account Recovery

- Password reset tokens are opaque random tokens.
- Email verification tokens are opaque random tokens.
- Only token hashes are stored in `auth_tokens`.
- Tokens expire and are marked used after consumption.

## Middleware

- `authenticate` verifies access JWTs and populates `req.auth`.
- `requireRole` restricts routes by role name.
- `requirePermission` restricts routes by permission key.

## Routes

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
POST /api/v1/auth/email/verify
GET  /api/v1/auth/me
```

This module does not create customer-management APIs.


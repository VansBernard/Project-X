# API Architecture

Project X should expose a versioned tenant-aware REST API.

Base path:

```text
/api/v1
```

## Route Groups

```text
/api/v1/auth
/api/v1/tenants
/api/v1/users
/api/v1/customers
/api/v1/contracts
/api/v1/devices
/api/v1/payments
/api/v1/webhooks/paystack
/api/v1/desktop
/api/v1/audit
/api/v1/admin
/api/v1/health
```

## API Standards

- JSON request and response bodies.
- HTTPS in deployed environments.
- Versioned routes.
- Request validation at the boundary.
- Consistent error envelope.
- Cursor pagination for lists.
- Idempotency keys for sensitive mutations.
- Structured logs with request IDs.
- No business state changes from unauthenticated clients.

## Request Lifecycle

Middleware order:

1. Request ID.
2. Structured logging.
3. Security headers.
4. CORS.
5. Body parser and size limits.
6. Rate limiting.
7. Authentication.
8. Tenant resolution.
9. Authorization.
10. Validation.
11. Route handler.
12. Error handler.

## Authentication Boundaries

Client types:

- Web staff user.
- Desktop device client.
- Platform administrator.
- Worker process.
- Paystack webhook sender.

Recommended mechanisms:

- Staff sessions or JWT access tokens with refresh tokens.
- Device credentials issued during desktop registration.
- Internal worker credentials if workers call API endpoints.
- Paystack webhook signature verification.

## Tenant Context

Tenant context should be resolved before tenant-scoped service calls.

Tenant context should include:

- Tenant ID.
- Actor ID.
- Actor type.
- Role or permission set.
- Request ID.
- Platform admin override flag when applicable.

## Authorization

Authorization should be checked for:

- Customer access.
- Contract access.
- Device access.
- Payment access.
- User and role management.
- Tenant settings.
- Device command creation.
- Platform admin operations.

The frontend may hide unavailable actions, but the API must enforce all access decisions.

## Standard Error Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "req_..."
  }
}
```

Validation errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "requestId": "req_...",
    "fields": [
      {
        "path": "email",
        "message": "Invalid email address."
      }
    ]
  }
}
```

## Webhook Boundary

Paystack webhook handling requires:

- Raw body access.
- Signature verification before trust.
- Durable event persistence.
- Event ID idempotency.
- Asynchronous processing where possible.
- Separation between received gateway event and reconciled internal state.

## Desktop Boundary

Desktop endpoints should be separate from staff web endpoints.

Desktop endpoint categories:

- Device registration.
- Device authentication.
- Heartbeat.
- State synchronization.
- Command polling.
- Command acknowledgement.
- Local event upload.
- Client update metadata.

The desktop API must not trust the local client as the authority for contract or payment status.


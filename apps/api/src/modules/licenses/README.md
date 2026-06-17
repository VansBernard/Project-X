# License Engine

The license engine issues and verifies signed device unlock licenses.

## Routes

```text
POST /api/v1/licenses
POST /api/v1/licenses/verify
GET  /api/v1/licenses/:licenseId
GET  /api/v1/devices/:deviceId/license
```

## Services

- `license.service.ts`: license issuing and active-license lookup.
- `signing.service.ts`: RSA 4096 private-key signing.
- `verification.service.ts`: RSA public-key verification.
- `canonical-json.ts`: deterministic JSON serialization used by both signing and verification.

## Trust Boundary

The backend private key signs licenses. The desktop public key verifies licenses. A laptop unlock decision must depend on a valid signature, matching device/contract IDs, and an unexpired license.

No email delivery is implemented in this module.

Email delivery is implemented separately under `delivery/` and runs only after verified successful payment state.

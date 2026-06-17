# Project X License Engine Security

## Goal

A laptop unlocks only when a valid signed license exists.

The backend signs licenses with an RSA 4096 private key. The desktop client verifies licenses with the matching public key.

## License Contents

Each signed license payload contains:

- `licenseId`
- `deviceId`
- `contractId`
- `issuedAt`
- `expiresAt`
- `keyId`
- `algorithm`

The digital signature is stored separately from the payload and is calculated over canonical JSON.

## Key Ownership

### Private Key

The RSA 4096 private key is stored only on the backend.

Rules:

- Never commit the private key to Git.
- Never embed the private key in the frontend or desktop client.
- Store the private key in the production secret manager.
- Load it through `LICENSE_PRIVATE_KEY_PEM_BASE64`.
- Rotate through `LICENSE_KEY_ID`.

### Public Key

The public key is safe to distribute and is stored in the desktop client.

Rules:

- Desktop verification uses only the public key.
- Public key replacement requires a signed desktop update or a trusted key rotation mechanism.
- The public key cannot issue licenses.

## Unlock Rule

The desktop client should unlock only when all of these are true:

- A license payload exists.
- The payload `deviceId` matches the local device.
- The payload `contractId` matches the assigned contract.
- The current time is after `issuedAt`.
- The current time is before `expiresAt`.
- The signature verifies using RSA-SHA256 and the embedded public key.

## Backend Rules

- The backend refuses to issue licenses for expired dates.
- The backend signs only active or completed contracts.
- The backend signs the exact canonical payload that is stored in the database.
- The backend never sends or stores the private key outside server secrets.

## Out Of Scope

This engine does not send licenses by email, implement email delivery, or define device lock UI behavior.

Offline desktop validation is documented separately in [offline-license-validation.md](./offline-license-validation.md).

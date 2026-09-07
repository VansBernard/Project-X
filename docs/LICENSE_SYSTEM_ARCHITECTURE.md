# Project X License System Architecture

## Purpose

This document captures the confirmed business and technical model for the Project X license system as implemented and discussed in the current project review.

It defines the separation between:
- temporary lock-screen recovery licenses
- permanent one-time lifetime unlocks
- offline device verification
- admin dashboard visibility

## Core product rule

The system has two distinct unlock types:

1. Temporary unlock license
   - used when the device enters the lock screen after the time limit is reached
   - requires payment before a temporary unlock can be issued
   - generated for a specific lock event or limited recovery window
   - must be freshly issued for each lock event

2. Permanent one-time unlock license
   - used to unlock the device forever after full settlement or one-time purchase
   - is bound to the device and contract
   - is intended to be used physically on the laptop by a dealer or authorized person
   - remains valid permanently once accepted
   - is displayed in the admin dashboard for reference and manual use on the device

## Why the system is split

The business model depends on two different use cases:

- lock-screen recovery is a temporary access recovery mechanism
- permanent unlock is a lifetime ownership / unlock mechanism

These cannot be merged into one license type because they have different:
- payment triggers
- validity lifetime
- issuance patterns
- verification rules
- dealer interaction expectation

## Device flow

### Registration flow
1. Dealer logs in.
2. Dealer registers the device and customer.
3. Device + contract are created.
4. Device metadata is stored with the associated contract.
5. A permanent one-time unlock credential is prepared for that device.
6. The admin dashboard exposes the permanent unlock key / credential for physical device use.

### Lock-screen flow
1. The time limit on the device is reached.
2. The dashboard / device transitions into the lock screen.
3. The user scans the QR code and pays on the website.
4. A temporary unlock license is issued for that lock event.
5. The user enters the temporary key on the device.
6. The device verifies it offline.
7. The device unlocks temporarily or for the recovery window.
8. The next lock event requires a new temporary license.

### Permanent unlock flow
1. The user or dealer completes permanent payment / full settlement.
2. The permanent one-time unlock credential is issued for the device.
3. The dealer sees the permanent unlock information in the admin dashboard.
4. The dealer uses the key physically on the laptop to unlock it forever.
5. The device stores and verifies the permanent unlock offline.
6. The device remains unlocked permanently until the permanent unlock is intentionally invalidated by a separate operational policy.

## Dashboard role

The admin dashboard is not intended to control unlocks remotely in this model.

Its role is to display the permanent unlock material for the dealer so he can physically access the device and apply the unlock key.

The dashboard should show:
- device name / ID
- contract reference
- permanent unlock code / payload status
- issue date
- one-time permanent unlock status

It should not be used as a remote revocation tool unless Product decides later to add an explicit admin-controlled permanent revoke feature.

## Offline verification model

The device should validate each license offline without a live API request.

Validation rules include:
- RSA signature is valid
- payload is signed by the backend private key
- device ID matches
- contract ID matches
- temporary licenses are not expired
- permanent unlock is valid for the device and has not been invalidated by a separate explicit policy

## License states

### Temporary license states
- pending
- issued
- redeemed
- expired
- failed

### Permanent license states
- issued
- activated
- active
- expired
- invalid

## Technical architecture

### Backend responsibilities
- issue signed temporary licenses
- issue signed permanent one-time licenses
- store license metadata
- keep the private key server-side only
- validate payment state before issuance
- expose the permanent unlock key / credential in admin-facing views

### Desktop responsibilities
- hold the public key for offline validation
- validate temporary and permanent certificates locally
- enforce lock-screen behavior
- reject invalid or mismatched signatures
- maintain unlock state on the device

### Admin responsibilities
- display the permanent unlock credential
- show associated contract and device details
- provide dealer references for physical device unlock

## Data model guidance

Use clear, separate license types rather than a single generic license concept.

Recommended fields:
- id
- deviceId
- contractId
- dealerId
- licenseType
- status
- issuedAt
- expiresAt
- keyId
- signedPayload
- signature
- signatureAlgorithm
- metadata

Recommended enum values:
- temporary
- permanent

## Recommended future implementation

The next production-quality iteration should add:
1. explicit licenseType to the Prisma model
2. separate issuance logic for temporary and permanent licenses
3. temporary validation with expiry checks
4. permanent validation with lifetime validity and no expiry requirement
5. admin dashboard display for permanent unlock material only
6. offline verification tests for both types

## Final decision

The system model confirmed in this review is:

- temporary unlocks are payment-driven recovery licenses
- permanent unlocks are one-time lifetime device unlocks
- dealer dashboard shows the permanent unlock key for physical device use
- all verification happens offline on the device
- the dashboard is not the revocation layer unless product requirements change later

This is the architecture to keep for future work and documentation.

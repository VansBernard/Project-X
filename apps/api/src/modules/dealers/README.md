# Dealer Management Module

This module provides dealer signup, dealer-scoped operations, and Super Admin dealer administration.

## Dealer Signup And Shared Credentials

The intended flow is:

1. A dealer signs up on the website.
2. The API creates a `dealer` record and a dealer-owner `user` record with the dealer's email/password.
3. The same credentials are used to log in to the admin dashboard.
4. When the dealer installs Project X on a customer's laptop, the installer/registration screen asks for the same dealer credentials.
5. The laptop app logs in with those credentials, receives a dealer-scoped token, then registers the laptop under that dealer.
6. The dealer dashboard can then show that dealer's customers, payment progress, devices, contracts, and licenses.

```text
POST /api/v1/dealers/signup
```

This route is public because it creates the first dealer account. It provisions the dealer's default roles and permissions, then creates the owner user with the `Dealer` role.

After signup, both the dashboard and laptop registration use:

```text
POST /api/v1/auth/login
```

with the dealer slug, email, and password.

## Clean Architecture Flow

```text
routes -> controllers -> services -> Prisma
```

Routes own HTTP paths, authentication, role checks, and validation. Controllers translate HTTP requests into service calls. Services enforce dealer isolation and coordinate persistence.

## Dealer Features

```text
POST  /api/v1/dealer/customers
GET   /api/v1/dealer/customers
PATCH /api/v1/dealer/customers/:customerId
POST  /api/v1/dealer/devices
POST  /api/v1/dealer/contracts
GET   /api/v1/dealer/payments
GET   /api/v1/dealer/reports
```

Dealer-scoped features use `req.auth.dealerId`; clients cannot choose another dealer ID for these routes.

The laptop registration flow should call `POST /api/v1/dealer/devices` only after the dealer has logged in. The registered device is automatically attached to the authenticated dealer from the token.

## Super Admin Features

```text
POST   /api/v1/admin/dealers
POST   /api/v1/admin/dealers/:dealerId/suspend
DELETE /api/v1/admin/dealers/:dealerId
GET    /api/v1/admin/dealers/:dealerId/statistics
```

Delete is implemented as a soft delete by setting `dealers.deleted_at` and `dealers.status = deleted`.

## Dealer Isolation

All dealer-owned service queries include `dealerId`. Related customer, device, contract, payment, and report operations are constrained to the authenticated dealer.

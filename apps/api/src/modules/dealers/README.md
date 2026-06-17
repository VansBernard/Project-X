# Dealer Management Module

This module provides dealer operations and Super Admin dealer administration.

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


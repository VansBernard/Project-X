# Customer Management Module

This module owns customer profiles, search/filtering, and customer history views.

## Stored Profile Fields

- Full name
- Phone
- Email
- Address
- National ID
- Emergency contact

The database still keeps `first_name` and `last_name` for compatibility with earlier schema work. New customer profile APIs accept `fullName` and derive first/last names for persistence.

## Routes

```text
POST  /api/v1/customers
GET   /api/v1/customers
GET   /api/v1/customers/:customerId
PATCH /api/v1/customers/:customerId
GET   /api/v1/customers/:customerId/contracts
GET   /api/v1/customers/:customerId/payments
GET   /api/v1/customers/:customerId/devices
```

## Scope

Payment history is read-only. This module does not create payment records, verify Paystack transactions, reconcile payments, or implement payment business logic.

## Dealer Isolation

Every service method requires the authenticated `dealerId`. Customer, contract, payment, and device queries are all scoped by that dealer.


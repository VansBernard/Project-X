# Contract Management Module

This module owns financing contract creation, contract status changes, and installment schedules.

## Tracked Fields

- Device price
- Deposit
- Remaining balance
- Installment amount
- Due dates
- Contract status

## Statuses

- `active`
- `completed`
- `defaulted`
- `cancelled`

## Business Rules

- Deposit cannot exceed device price.
- Remaining balance must be greater than zero.
- First due date cannot be in the past.
- Installment amount multiplied by installment count must exactly equal remaining balance.
- New contracts start as `active`.
- Terminal statuses are `completed`, `defaulted`, and `cancelled`.
- Terminal contracts cannot move to another status.
- Active contracts can move to `completed`, `defaulted`, or `cancelled`.
- Cancelling/defaulting/completing a contract updates pending installment statuses accordingly.

## Routes

```text
POST  /api/v1/contracts
GET   /api/v1/contracts
GET   /api/v1/contracts/:contractId
PATCH /api/v1/contracts/:contractId/status
GET   /api/v1/contracts/:contractId/schedule
```

## Scope

This module does not create payments, verify payments, reconcile payments, or integrate with Paystack.


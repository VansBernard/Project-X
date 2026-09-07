# Dashboard API Implementation Guide

## Overview
Successfully implemented REST API endpoints for the admin dashboard. The implementation provides real-time KPI calculations and historical analytics data for dashboards and reporting.

## Architecture

### Module Structure
```
apps/api/src/modules/dashboard/
├── index.ts                    # Module exports
├── dashboard.types.ts          # TypeScript interfaces
├── dashboard.service.ts        # Business logic & DB queries
├── dashboard.controller.ts     # HTTP handlers
├── dashboard.routes.ts         # Route definitions
├── dashboard.test.ts           # Integration tests
└── README.md                   # API documentation
```

## Implementation Details

### 1. Dashboard Statistics Endpoint

**Route:** `GET /api/v1/dashboard/stats`

**Purpose:** Retrieve key performance indicators for the dashboard

**Features:**
- Calculates total revenue from all successful payments
- Tracks outstanding balance across active contracts
- Counts active devices and contracts
- Provides recent transaction history (last 10 payments)
- Aggregates license issuance metrics

**Data Aggregations:**
- Revenue: SUM of all successful payments
- Outstanding Balance: SUM of remaining_balance from active contracts
- Active Devices: COUNT where status IN ('active', 'assigned')
- Active Contracts: COUNT where status = 'active'
- Licenses Issued: COUNT where status IN ('active', 'pending')

### 2. Analytics Endpoint

**Route:** `GET /api/v1/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Purpose:** Retrieve daily analytics for a date range

**Features:**
- Daily revenue aggregation
- New deals (contracts) created per day
- Licenses issued per day
- Active devices count per day
- Automatic date range initialization (includes dates with zero data)

**Data Aggregations:**
- For each date in the range:
  - Revenue: SUM of payment amounts (payments.paidAt on that date)
  - New Deals: COUNT of contracts created on that date
  - Licenses Issued: COUNT of licenses created on that date
  - Devices Active: COUNT of active/assigned devices (total count, not per date)

## Security

- Both endpoints require authentication (Bearer token)
- Authorization automatically scoped to the dealer from the JWT token
- No cross-dealer data leakage possible

## Usage Examples

### React Hook Integration (Admin Dashboard)

The admin dashboard already has hooks configured:

```typescript
// Get dashboard stats
const { stats, loading, error, fetch } = useDashboardStats();

// Fetch on component mount
useEffect(() => {
  fetch();
}, [fetch]);

// Get analytics for date range
const { data: analyticsData } = useAnalyticsData([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0],
]);
```

### cURL Examples

```bash
# Get dashboard stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/dashboard/stats

# Get last 30 days analytics
START_DATE=$(date -d '30 days ago' +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/v1/dashboard/analytics?startDate=$START_DATE&endDate=$END_DATE"
```

### JavaScript Fetch

```javascript
// Stats
const statsResponse = await fetch('/api/v1/dashboard/stats', {
  headers: { 'Authorization': 'Bearer ' + accessToken }
});
const stats = await statsResponse.json();

// Analytics
const analyticsResponse = await fetch(
  `/api/v1/dashboard/analytics?startDate=2026-05-16&endDate=2026-06-16`,
  { headers: { 'Authorization': 'Bearer ' + accessToken } }
);
const analytics = await analyticsResponse.json();
```

## Error Handling

### 401 Unauthorized
- Missing or invalid authentication token
- Returned when `Authorization` header is not provided or token is invalid

### 400 Bad Request
- Missing required query parameters (`startDate`, `endDate`)
- Invalid date format (not ISO YYYY-MM-DD)
- `startDate` is after `endDate`

### Response Format
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Descriptive error message"
  }
}
```

## Performance Considerations

### Database Queries
- **Stats endpoint:** 5 parallel queries (payments, contracts, licenses, devices, recent payments)
- **Analytics endpoint:** 4 queries (payments, contracts, licenses, devices)
- All queries are indexed and filtered by `dealerId` and `deletedAt`

### Optimization Tips
1. For large date ranges in analytics, consider pagination
2. Cache stats results for a short period (5-10 seconds) if needed
3. Consider materialized views for frequently accessed analytics

### Indexes Used
- `payments(dealerId, status, deletedAt, paidAt)`
- `contracts(dealerId, status, deletedAt, createdAt)`
- `licenses(dealerId, status, deletedAt, createdAt)`
- `devices(dealerId, status, deletedAt)`

## Testing

Run the test suite:
```bash
npm test -- dashboard
```

Test file: `apps/api/src/modules/dashboard/dashboard.test.ts`

Tests cover:
- Successful stat retrieval
- Successful analytics retrieval
- Authentication validation
- Date parameter validation
- Error handling

## Future Enhancements

Potential additions to consider:
1. Drill-down endpoints (e.g., `/dashboard/stats/top-customers`)
2. Comparison endpoints (previous period vs current)
3. Custom date range caching
4. Export functionality (CSV/PDF)
5. Predictive analytics
6. Trend analysis
7. Anomaly detection

## Related Files

- Frontend hooks: `apps/admin/src/lib/hooks.ts`
- Admin dashboard page: `apps/admin/src/pages/DashboardPage.tsx`
- Type definitions: `apps/admin/src/types/index.ts`
- API configuration: `apps/admin/src/lib/api.ts`

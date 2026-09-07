# Dashboard API Quick Reference

## Endpoints Implemented

### 1. Dashboard Statistics
```
GET /api/v1/dashboard/stats
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000.50,
    "outstandingBalance": 45000.00,
    "activeDevices": 156,
    "activeContracts": 89,
    "licensesIssued": 234,
    "recentTransactions": [
      {
        "id": "507f1f77bcf86cd799439011",
        "type": "payment",
        "amount": 5000,
        "description": "Payment from John Doe",
        "date": "2026-06-16T10:30:00.000Z",
        "status": "success"
      }
    ]
  }
}
```

---

### 2. Analytics Data
```
GET /api/v1/analytics?startDate=2026-05-17&endDate=2026-06-16
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | ISO date format (YYYY-MM-DD) |
| endDate | string | Yes | ISO date format (YYYY-MM-DD) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-05-17",
      "revenue": 12500.50,
      "newDeals": 5,
      "licensesIssued": 15,
      "devicesActive": 150
    },
    {
      "date": "2026-05-18",
      "revenue": 8300.00,
      "newDeals": 3,
      "licensesIssued": 12,
      "devicesActive": 152
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "startDate and endDate query parameters are required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication is required."
  }
}
```

---

## Frontend Integration

### Using React Hooks

```typescript
import { useDashboardStats, useAnalyticsData } from '../lib/hooks';

function DashboardComponent() {
  // Get KPI stats
  const { stats, loading: statsLoading } = useDashboardStats();
  
  // Get analytics for last 30 days
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  
  const { data: analyticsData, loading: analyticsLoading } = useAnalyticsData(
    [startDate, endDate]
  );

  if (statsLoading || analyticsLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Revenue: ${stats?.totalRevenue}</h2>
      <p>Active Devices: {stats?.activeDevices}</p>
    </div>
  );
}
```

---

## Database Schema

### Tables Used
- **payments** - For revenue calculations
- **contracts** - For balance and deals tracking
- **licenses** - For license issuance metrics
- **devices** - For active device counts

### Key Indexes
- `payments(dealerId, status, paidAt, deletedAt)`
- `contracts(dealerId, status, createdAt, deletedAt)`
- `licenses(dealerId, status, createdAt, deletedAt)`
- `devices(dealerId, status, deletedAt)`

---

## Testing Endpoints

### Using cURL

**Get Stats:**
```bash
curl -X GET "http://localhost:4000/api/v1/dashboard/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Analytics:**
```bash
curl -X GET "http://localhost:4000/api/v1/analytics?startDate=2026-05-17&endDate=2026-06-16" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman

1. Create new GET request
2. URL: `http://localhost:4000/api/v1/dashboard/stats`
3. Go to "Authorization" tab
4. Type: "Bearer Token"
5. Token: `<your_access_token>`
6. Send

---

## Performance Notes

- Stats endpoint makes 5 parallel database queries
- Analytics endpoint makes 4 database queries
- All queries are indexed for optimal performance
- Response times typically < 500ms for date ranges up to 1 year

## Module Files

| File | Purpose |
|------|---------|
| `dashboard.types.ts` | TypeScript type definitions |
| `dashboard.service.ts` | Business logic & database queries |
| `dashboard.controller.ts` | HTTP request/response handlers |
| `dashboard.routes.ts` | Express route definitions |
| `dashboard.test.ts` | Integration tests |
| `index.ts` | Module exports |
| `README.md` | Detailed API documentation |

---

**Last Updated:** 2026-06-16

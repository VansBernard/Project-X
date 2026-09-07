## Dashboard API

Dashboard module provides real-time statistics and analytics data for the admin dashboard.

### Endpoints

#### GET `/api/v1/dashboard/stats`

Get key performance indicators (KPI) and statistics for the dashboard.

**Authentication:** Required (Bearer token)

**Response:**
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
        "id": "uuid",
        "type": "payment",
        "amount": 5000,
        "description": "Payment from John Doe",
        "date": "2026-06-16T10:30:00Z",
        "status": "success"
      }
    ]
  }
}
```

**Returns:**
- `totalRevenue`: Sum of all successful payments (number)
- `outstandingBalance`: Total remaining balance across active contracts (number)
- `activeDevices`: Count of devices with status 'active' or 'assigned' (number)
- `activeContracts`: Count of contracts with status 'active' (number)
- `licensesIssued`: Count of licenses with status 'active' or 'pending' (number)
- `recentTransactions`: Last 10 transactions array

---

#### GET `/api/v1/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Get analytics data for a specified date range.

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `startDate` (required): Start date in ISO format (YYYY-MM-DD)
- `endDate` (required): End date in ISO format (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-06-01",
      "revenue": 12500.50,
      "newDeals": 5,
      "licensesIssued": 15,
      "devicesActive": 150
    },
    {
      "date": "2026-06-02",
      "revenue": 8300.00,
      "newDeals": 3,
      "licensesIssued": 12,
      "devicesActive": 150
    }
  ]
}
```

**Returns:** Array of daily analytics data:
- `date`: Date in YYYY-MM-DD format (string)
- `revenue`: Total revenue for that day (number)
- `newDeals`: Count of new active contracts created that day (number)
- `licensesIssued`: Count of new licenses issued that day (number)
- `devicesActive`: Count of active/assigned devices (number)

---

### Usage Examples

#### Fetch Dashboard Statistics
```javascript
const response = await fetch('/api/v1/dashboard/stats', {
  headers: {
    'Authorization': 'Bearer <access_token>'
  }
});
const data = await response.json();
```

#### Fetch Analytics for Last 30 Days
```javascript
const endDate = new Date();
const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

const params = new URLSearchParams({
  startDate: startDate.toISOString().split('T')[0],
  endDate: endDate.toISOString().split('T')[0]
});

const response = await fetch(`/api/v1/dashboard/analytics?${params}`, {
  headers: {
    'Authorization': 'Bearer <access_token>'
  }
});
const data = await response.json();
```

### Error Responses

- `401`: Unauthorized - Missing or invalid authentication token
- `400`: Bad Request - Invalid query parameters or missing required fields

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "startDate and endDate query parameters are required"
  }
}
```

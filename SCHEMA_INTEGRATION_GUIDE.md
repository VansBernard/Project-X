# Quick Reference: Schema Overview & Application Integration

## 📊 Schema Diagram (Text Representation)

```
┌─────────────┐
│  CUSTOMERS  │ (id, full_name, email, phone, account_status)
└──────┬──────┘
       │
       ├───────────────────────────────────────┐
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌──────────────────┐
│  LAPTOPS    │◄──────────┐             │ FINANCING_       │
│ (id, cust_  │           │             │ CONTRACTS        │
│  id, HW_UUID)           │             │ (id, laptop_id,  │
└──────┬──────┘           │             │  amount_paid,    │
       │              (FK)│             │  time_token)     │
       │                  │             └──────┬───────────┘
       │                  │                    │
       └──────────────────┴────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                    │
                ▼                    ▼
         ┌──────────────┐    ┌──────────────────┐
         │ PAYMENT_     │    │ TIME_TOKEN_LOG   │
         │ HISTORY      │    │ (8-digit tokens) │
         │ (Paystack    │    │ (offline verify) │
         │  ref)        │    │                  │
         └──────────────┘    └──────────────────┘
                │                    │
                └────────────────────┤
                                     ▼
                            ┌──────────────────┐
                            │  AUDIT_LOG       │
                            │ (all changes)    │
                            └──────────────────┘
```

---

## 🔑 Key Fields for Integration

### **For Laptop Identification (Offline)**
```sql
-- The critical field for device lock/unlock in offline mode:
laptops.hardware_uuid  -- Unique hardware ID from BIOS

-- Example usage:
SELECT id, device_name, total_device_cost 
FROM laptops 
WHERE hardware_uuid = 'UNIQUE-HW-ID-FROM-DEVICE';
```

### **For Payment Status Check**
```sql
-- Get current payment status:
SELECT 
    fc.id,
    fc.amount_paid_to_date,
    fc.total_contract_amount,
    fc.amount_remaining,
    fc.contract_status,
    CASE 
        WHEN fc.amount_remaining = 0 THEN 'Fully_Paid'
        WHEN fc.amount_paid_to_date = 0 THEN 'No_Payments'
        ELSE 'In_Progress'
    END as payment_progress
FROM financing_contracts fc
WHERE fc.laptop_id = 'laptop-uuid-here';
```

### **For Time-Token Verification (8-digit)**
```sql
-- Validate offline token:
SELECT * FROM verify_time_token('contract-id', '12345678');

-- Result: 
-- is_valid | reason
-- ---------+--------
--  true    | Valid
--  false   | Token expired
--  false   | Token already used
```

---

## 🔐 Account Status Flow

```
Active
  ├─→ (payment missed) → Delinquent
  ├─→ (all paid) → Fully_Paid
  └─→ (contract ended) → Terminated

Delinquent
  ├─→ (payment received) → Active
  ├─→ (unpaid 90+ days) → Suspended
  └─→ (payment plan made) → Active

Fully_Paid
  └─→ (no further action needed)

Suspended
  ├─→ (payment received) → Active
  └─→ (unpaid 180+ days) → Terminated
```

---

## 💻 Sample Application Code

### **Example 1: Node.js/Express - Check Payment Status**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Endpoint: GET /api/devices/:hardwareUUID/status
app.get('/api/devices/:hardwareUUID/status', async (req, res) => {
  try {
    const { hardwareUUID } = req.params;
    
    const result = await pool.query(`
      SELECT 
        l.id,
        l.device_name,
        c.full_name,
        c.account_status,
        fc.contract_status,
        fc.amount_paid_to_date,
        fc.total_contract_amount,
        fc.amount_remaining,
        fc.next_payment_due_date,
        CASE 
          WHEN c.account_status = 'Delinquent' THEN 'LOCK'
          WHEN fc.contract_status = 'Suspended' THEN 'RESTRICT_LOGIN'
          WHEN c.account_status = 'Fully_Paid' THEN 'UNLOCK'
          ELSE 'ALLOW'
        END as action
      FROM laptops l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN financing_contracts fc ON l.id = fc.laptop_id
      WHERE l.hardware_uuid = $1
        AND l.device_status = 'Active'
      LIMIT 1
    `, [hardwareUUID]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const device = result.rows[0];
    
    res.json({
      device_id: device.id,
      device_name: device.device_name,
      owner: device.full_name,
      payment_status: {
        paid: device.amount_paid_to_date,
        total: device.total_contract_amount,
        remaining: device.amount_remaining,
        account_status: device.account_status
      },
      enforcement_action: device.action,
      next_payment_due: device.next_payment_due_date,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### **Example 2: Python - Issue Time Token**

```python
import psycopg2
from datetime import datetime, timedelta
import uuid

def issue_time_token(contract_id, issued_by):
    """
    Issue an 8-digit time token for offline device verification.
    Token expires in 30 days.
    """
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="financing_app",
            user="postgres",
            password="your_password"
        )
        cursor = conn.cursor()
        
        # Generate token using database function
        cursor.execute("SELECT generate_time_token() AS token;")
        token = cursor.fetchone()[0]
        
        # Insert into time_token_log
        expires_at = datetime.utcnow() + timedelta(days=30)
        
        cursor.execute("""
            INSERT INTO time_token_log 
            (contract_id, customer_id, time_token, token_issued_at, 
             token_expires_at, issued_by)
            SELECT 
                %s, 
                customer_id,
                %s,
                CURRENT_TIMESTAMP,
                %s,
                %s
            FROM financing_contracts
            WHERE id = %s
            RETURNING time_token, token_expires_at;
        """, (contract_id, token, expires_at, issued_by, contract_id))
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'token': result[0],
            'expires_at': result[1].isoformat(),
            'contract_id': str(contract_id)
        }
        
    except Exception as e:
        print(f"Error issuing token: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

# Usage
token_info = issue_time_token('contract-uuid', 'admin_user')
print(f"Token: {token_info['token']}")  # Output: 12345678
print(f"Expires: {token_info['expires_at']}")
```

---

### **Example 3: C# - Record Payment (Paystack Integration)**

```csharp
using Npgsql;
using NpgsqlTypes;

public class PaymentService
{
    private readonly string _connectionString;
    
    public PaymentService(string connectionString)
    {
        _connectionString = connectionString;
    }
    
    // Called after Paystack webhook confirms payment
    public async Task<bool> RecordPaymentAsync(
        Guid contractId,
        Guid customerId,
        decimal amount,
        string paystackReference)
    {
        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            
            await using var cmd = new NpgsqlCommand(
                @"
                BEGIN;
                
                -- Insert payment record
                INSERT INTO payment_history 
                (contract_id, customer_id, payment_amount, 
                 transaction_reference, paystack_reference, payment_method)
                VALUES (@contractId, @customerId, @amount, 
                        @reference, @paystackRef, 'Paystack');
                
                -- Update contract amount_paid_to_date
                UPDATE financing_contracts
                SET amount_paid_to_date = amount_paid_to_date + @amount,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @contractId;
                
                -- Log audit
                INSERT INTO audit_log 
                (entity_type, entity_id, customer_id, action, 
                 new_values, created_by)
                VALUES ('financing_contracts', @contractId, @customerId, 
                        'PAYMENT_RECORDED', 
                        jsonb_build_object('amount', @amount), 'paystack_webhook');
                
                COMMIT;
                ", conn)
            {
                Parameters =
                {
                    new NpgsqlParameter("@contractId", contractId),
                    new NpgsqlParameter("@customerId", customerId),
                    new NpgsqlParameter("@amount", amount),
                    new NpgsqlParameter("@reference", Guid.NewGuid().ToString()),
                    new NpgsqlParameter("@paystackRef", paystackReference)
                }
            };
            
            await cmd.ExecuteNonQueryAsync();
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error recording payment: {ex.Message}");
            return false;
        }
    }
    
    // Check if customer is delinquent and needs enforcement
    public async Task<(bool IsCompliant, string Action)> 
        CheckComplianceAsync(Guid customerId)
    {
        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            
            await using var cmd = new NpgsqlCommand(
                @"
                SELECT 
                    account_status,
                    (SELECT contract_status FROM financing_contracts 
                     WHERE customer_id = @customerId LIMIT 1) as contract_status
                FROM customers
                WHERE id = @customerId;
                ", conn)
            {
                Parameters = { new NpgsqlParameter("@customerId", customerId) }
            };
            
            var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var status = reader["account_status"].ToString();
                var contractStatus = reader["contract_status"]?.ToString() ?? "Active";
                
                if (status == "Delinquent")
                    return (false, "LOCK_SCREEN");
                
                if (status == "Suspended")
                    return (false, "RESTRICT_LOGIN");
                
                if (contractStatus == "Terminated")
                    return (false, "DEACTIVATE_DEVICE");
                
                return (true, "ALLOW");
            }
            
            return (true, "ALLOW");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error checking compliance: {ex.Message}");
            return (true, "ALLOW"); // Fail open on errors
        }
    }
}

// Usage in webhook handler
[HttpPost("api/webhooks/paystack")]
public async Task<IActionResult> HandlePaystackWebhook([FromBody] PaystackWebhook webhook)
{
    var paymentService = new PaymentService(_connectionString);
    
    bool recorded = await paymentService.RecordPaymentAsync(
        webhook.ContractId,
        webhook.CustomerId,
        webhook.Amount,
        webhook.Reference
    );
    
    if (recorded)
    {
        // Check if status changed
        var (isCompliant, action) = await paymentService.CheckComplianceAsync(
            webhook.CustomerId
        );
        
        // If now compliant, notify device to unlock
        if (isCompliant && action == "ALLOW")
        {
            await _deviceNotificationService.SendUnlockAsync(
                webhook.CustomerId
            );
        }
    }
    
    return Ok();
}
```

---

### **Example 4: SQL - Dashboard Queries**

```sql
-- Query 1: Active Contracts with Payment Status
SELECT * FROM v_active_contracts
WHERE payment_status IN ('Overdue', 'Due Soon')
ORDER BY days_until_payment;

-- Query 2: Delinquent Accounts Requiring Action
SELECT * FROM v_delinquent_accounts
ORDER BY total_outstanding DESC;

-- Query 3: Payment Collection Report (Last 30 days)
SELECT 
    DATE(ph.payment_date) as payment_date,
    COUNT(*) as num_payments,
    SUM(ph.payment_amount) as total_collected,
    AVG(ph.payment_amount) as avg_payment
FROM payment_history ph
WHERE ph.payment_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ph.payment_date)
ORDER BY payment_date DESC;

-- Query 4: Device Audit Trail
SELECT 
    al.created_at,
    al.action,
    al.entity_type,
    al.change_reason,
    al.created_by
FROM audit_log al
WHERE al.customer_id = 'customer-uuid-here'
ORDER BY al.created_at DESC
LIMIT 50;

-- Query 5: Time Token Utilization (Offline access)
SELECT 
    COUNT(*) as total_tokens_issued,
    SUM(CASE WHEN was_used THEN 1 ELSE 0 END) as used_tokens,
    SUM(CASE WHEN is_revoked THEN 1 ELSE 0 END) as revoked_tokens,
    SUM(CASE WHEN token_expires_at < CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as expired_tokens
FROM time_token_log
WHERE DATE(token_issued_at) = CURRENT_DATE;
```

---

## 🚀 Performance Tips

### **For High-Traffic Scenarios:**

1. **Index on frequently queried fields** (already included)
2. **Use connection pooling** (PgBouncer or application-level)
3. **Archive old payment records** (partition by year)
4. **Cache active contracts view** (Redis)

```sql
-- Example: Partition payment_history by year
CREATE TABLE payment_history_2024 PARTITION OF payment_history
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE payment_history_2025 PARTITION OF payment_history
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

---

## 📋 Integration Checklist

- [ ] Database migration successful
- [ ] All 6 tables created
- [ ] All 30+ indexes created
- [ ] 4 triggers working
- [ ] 3 functions callable
- [ ] 2 views queryable
- [ ] Test data inserted successfully
- [ ] API endpoints accept/parse data
- [ ] Paystack webhook integration tested
- [ ] Time-token generation tested
- [ ] Account status updates trigger lock/unlock
- [ ] Audit logs capture all changes
- [ ] Performance tests passed (sub-100ms queries)

---

**This schema is production-ready and handles:**
✅ Offline operation via time tokens  
✅ Device identification via hardware UUIDs  
✅ Payment processing via Paystack  
✅ Enforcement actions (lock/unlock)  
✅ Full audit trail for compliance  
✅ Multi-contract customer support

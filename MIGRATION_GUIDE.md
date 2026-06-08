# PostgreSQL Migration Execution Guide
## Laptop Financing & Lease-Lock Application

---

## WHAT TO DO WHEN YOU EXECUTE THIS MIGRATION

### **BEFORE EXECUTION: Pre-Flight Checklist**

- [ ] PostgreSQL 12+ installed and running
- [ ] Database created: `CREATE DATABASE financing_app;`
- [ ] Connection credentials ready (host, port, username, password)
- [ ] Backup of existing database (if upgrading)
- [ ] Test environment ready (never run directly on production first)

---

## **EXECUTION METHODS**

### **Method 0: Using Supabase (Recommended Cloud Setup)**

1. Create a Supabase project.
2. Open **Project Settings** → **Database** → **Connection string**.
3. Copy the pooled connection string and set it in `backend/.env`:

```bash
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres
PGSSLMODE=require
```

4. Run the existing migrations from the backend:

```bash
cd backend
npm run migrate
```

5. Do not run `create_db.js` against Supabase. Supabase already creates the `postgres` database for your project.

---

### **Method 1: Using psql Command Line (RECOMMENDED FOR FIRST RUN)**

```bash
# Option A: Interactive execution
psql -U postgres -d financing_app -f /path/to/001_initial_schema.sql

# Option B: With specific host/port
psql -h localhost -p 5432 -U postgres -d financing_app -f /path/to/001_initial_schema.sql

# Option C: With output logging
psql -U postgres -d financing_app -f /path/to/001_initial_schema.sql > migration_output.log 2>&1
```

**Expected output:**
```
CREATE EXTENSION
CREATE TYPE
CREATE TABLE
CREATE INDEX
...
(No errors = Success)
```

---

### **Method 2: Using pgAdmin (GUI)**

1. Open pgAdmin
2. Right-click on "Databases" → "Create" → "Database"
3. Name: `financing_app` → Save
4. Open Query Tool (Tools → Query Tool)
5. Paste entire script
6. Click "Execute Script" (⚡ icon)
7. Check "Messages" tab for confirmations

---

### **Method 3: Using Docker (If PostgreSQL is containerized)**

```bash
# Copy migration file into container
docker cp 001_initial_schema.sql postgres_container:/tmp/

# Execute inside container
docker exec -u postgres postgres_container psql -d financing_app -f /tmp/001_initial_schema.sql

# Verify
docker exec -u postgres postgres_container psql -d financing_app -c "\dt"
```

---

### **Method 4: Using Node.js/JavaScript (For CI/CD)**

```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'financing_app',
  user: 'postgres',
  password: 'your_password'
});

async function runMigration() {
  const migrationScript = fs.readFileSync('./001_initial_schema.sql', 'utf8');
  
  try {
    const client = await pool.connect();
    await client.query(migrationScript);
    console.log('✅ Migration executed successfully');
    await client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
```

---

### **Method 5: Using Python (Alternative)**

```python
import psycopg2
import sys

def run_migration(script_path):
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="financing_app",
            user="postgres",
            password="your_password"
        )
        cursor = conn.cursor()
        
        with open(script_path, 'r') as f:
            migration_script = f.read()
        
        cursor.execute(migration_script)
        conn.commit()
        
        print("✅ Migration completed successfully")
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration('./001_initial_schema.sql')
```

---

## **AFTER EXECUTION: Verification Steps**

### **Step 1: Verify Tables Created**

```sql
-- List all tables
\dt

-- Expected output:
--              List of relations
--  Schema |            Name            | Type  | Owner
-- --------+----------------------------+-------+--------
--  public | audit_log                  | table | postgres
--  public | customers                  | table | postgres
--  public | financing_contracts        | table | postgres
--  public | laptops                    | table | postgres
--  public | payment_history            | table | postgres
--  public | time_token_log             | table | postgres
```

---

### **Step 2: Verify Indexes Created**

```sql
-- List all indexes
\di

-- Or detailed index info:
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected: 30+ indexes across all tables**

---

### **Step 3: Verify Views Created**

```sql
-- List all views
\dv

-- Expected:
--       List of relations
--  Schema |         Name         | Type | Owner
-- --------+----------------------+------+--------
--  public | v_active_contracts   | view | postgres
--  public | v_delinquent_accounts | view | postgres
```

---

### **Step 4: Verify Functions/Stored Procedures**

```sql
-- List all functions
\df

-- Expected functions:
-- - generate_time_token()
-- - verify_time_token()
-- - update_account_status()
-- - update_timestamp()
-- - sync_financing_status()
```

---

### **Step 5: Verify Triggers**

```sql
-- List all triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- Expected:
--        trigger_name         | event_manipulation | event_object_table
-- ---------------------------+--------------------+--------------------
--  trigger_customers_update_timestamp           | UPDATE             | customers
--  trigger_laptops_update_timestamp             | UPDATE             | laptops
--  trigger_financing_update_timestamp           | UPDATE             | financing_contracts
--  trigger_financing_sync_status                | UPDATE             | financing_contracts
```

---

## **WHEN EXECUTION COMPLETES: What Each Component Does**

### **Tables Created:**

| Table | Purpose |
|-------|---------|
| `customers` | Stores customer account info & status (Active/Delinquent/Fully_Paid) |
| `laptops` | Device inventory with hardware UUID for offline identification |
| `financing_contracts` | Loan/lease agreements with payment tracking & time-token system |
| `payment_history` | Audit trail of all payments (integrates with Paystack) |
| `time_token_log` | Tracks 8-digit tokens issued for offline verification |
| `audit_log` | Compliance log of all system changes |

### **Indexes Created (Performance):**

- **`idx_laptops_hardware_uuid`** ← Fast device lookup (laptop lock/unlock)
- **`idx_financing_laptop_id`** ← Quick contract retrieval by device
- **`idx_customers_email`** ← Fast customer lookup by email
- **`idx_financing_time_token`** ← 8-digit token validation speed
- Plus 25+ composite indexes for complex queries

### **Views Created (Convenience):**

- **`v_active_contracts`** ← Dashboard showing all active agreements with payment status
- **`v_delinquent_accounts`** ← Flag accounts overdue for enforcement

### **Functions/Procedures:**

```sql
-- Example usage:

-- Generate a new 8-digit time token
SELECT generate_time_token();
-- Returns: '12345678'

-- Verify a time token
SELECT * FROM verify_time_token(contract_id_uuid, '12345678');
-- Returns: is_valid=true/false, reason=explanation

-- Change customer account status
SELECT update_account_status(customer_id_uuid, 'Delinquent'::account_status_enum, 'admin_user');
```

---

## **COMMON EXECUTION ISSUES & SOLUTIONS**

### **Issue 1: Extension `uuid-ossp` not found**

**Error:**
```
ERROR: extension "uuid-ossp" does not exist
```

**Solution:**
```bash
# Install PostgreSQL contrib package
sudo apt-get install postgresql-contrib  # Linux
brew install postgresql                  # macOS

# Then re-run migration
```

---

### **Issue 2: Database doesn't exist**

**Error:**
```
FATAL: database "financing_app" does not exist
```

**Solution:**
```bash
# Create database first
createdb financing_app

# Or via psql
psql -U postgres -c "CREATE DATABASE financing_app;"
```

---

### **Issue 3: Permission denied**

**Error:**
```
ERROR: permission denied
```

**Solution:**
```bash
# Run as PostgreSQL superuser
psql -U postgres -d financing_app -f migration.sql

# Or create a user with permissions:
psql -U postgres -c "ALTER USER your_user CREATEDB;"
```

---

### **Issue 4: Foreign key constraint errors**

**Error:**
```
ERROR: insert or update on table "financing_contracts" violates foreign key constraint
```

**Solution:** Ensure all referenced records exist:
```sql
-- Check referential integrity
SELECT l.id FROM laptops l 
LEFT JOIN customers c ON l.customer_id = c.id 
WHERE c.id IS NULL;
```

---

## **FIRST TEST DATA INSERTION**

Once migration completes successfully, test with sample data:

```sql
-- 1. Insert a customer
INSERT INTO customers (full_name, email, phone_number, account_status)
VALUES ('John Doe', 'john@example.com', '+1234567890', 'Active')
RETURNING id;
-- Save the returned UUID as $CUSTOMER_ID

-- 2. Insert a laptop
INSERT INTO laptops (customer_id, hardware_uuid, device_name, total_device_cost)
VALUES ('$CUSTOMER_ID', 'UNIQUE-UUID-FROM-BIOS-12345', 'MacBook Pro 2024', 1500.00)
RETURNING id;
-- Save the returned UUID as $LAPTOP_ID

-- 3. Create financing contract
INSERT INTO financing_contracts 
(laptop_id, customer_id, total_contract_amount, amount_paid_to_date, 
 target_expiration_year, target_expiration_month, monthly_payment_amount)
VALUES 
('$LAPTOP_ID', '$CUSTOMER_ID', 1500.00, 0.00, 2026, 12, 125.00)
RETURNING id;
-- Save the returned UUID as $CONTRACT_ID

-- 4. Generate a time token
INSERT INTO time_token_log 
(contract_id, customer_id, time_token, token_expires_at)
VALUES 
('$CONTRACT_ID', '$CUSTOMER_ID', generate_time_token(), 
 CURRENT_TIMESTAMP + INTERVAL '30 days')
RETURNING time_token;

-- 5. Verify everything
SELECT * FROM v_active_contracts;
```

---

## **ROLLBACK (If something goes wrong)**

```sql
-- Option 1: Drop everything and start over
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Then re-run migration

-- Option 2: Drop specific tables (order matters due to foreign keys)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS time_token_log CASCADE;
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS financing_contracts CASCADE;
DROP TABLE IF EXISTS laptops CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
```

---

## **NEXT STEPS AFTER SUCCESSFUL MIGRATION**

1. ✅ **Build API Layer** - Create REST endpoints to interact with tables
2. ✅ **Implement 8-Digit Token System** - Logic to generate/validate tokens for offline use
3. ✅ **Paystack Integration** - Connect payment gateway to `payment_history` table
4. ✅ **Device Lock/Unlock Logic** - Use `hardware_uuid` to identify devices
5. ✅ **Dashboard Queries** - Use `v_active_contracts` view for monitoring
6. ✅ **Audit & Logging** - Capture all changes in `audit_log` for compliance
7. ✅ **Backup Strategy** - Set up daily automated backups

---

## **PRODUCTION DEPLOYMENT CHECKLIST**

Before going live:

- [ ] Run on test environment first
- [ ] Backup production database
- [ ] Schedule migration during maintenance window
- [ ] Have rollback plan ready
- [ ] Monitor logs post-migration
- [ ] Verify all views & functions working
- [ ] Load test with realistic data volume
- [ ] Security audit (permissions, encryption)
- [ ] Document changes in changelog
- [ ] Update data dictionary for team

---

## **SUPPORT & DEBUGGING**

### **View PostgreSQL Logs**

```bash
# On Linux
tail -f /var/log/postgresql/postgresql.log

# On Docker
docker logs -f postgres_container

# Inside psql
SHOW log_statement;  -- Check what's being logged
```

### **Monitor Active Connections**

```sql
SELECT pid, usename, state, query 
FROM pg_stat_activity 
WHERE datname = 'financing_app';
```

### **Check Table Sizes**

```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**Migration Version:** 1.0.0  
**Last Updated:** 2026-06-04  
**Status:** Production Ready ✅

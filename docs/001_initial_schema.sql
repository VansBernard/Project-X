-- ============================================================================
-- LAPTOP FINANCING & LEASE-LOCK APPLICATION
-- Production-Ready PostgreSQL Schema Migration
-- Generated: 2026-06-04
-- Version: 1.0.0
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS (Must be created before tables that reference them)
-- ============================================================================

-- Account status enum
CREATE TYPE account_status_enum AS ENUM (
    'Active',
    'Delinquent',
    'Fully_Paid',
    'Suspended',
    'Terminated'
);

-- Contract status enum (mirrors account status for data consistency)
CREATE TYPE contract_status_enum AS ENUM (
    'Active',
    'Delinquent',
    'Fully_Paid',
    'Suspended',
    'Terminated'
);

-- Device status enum
CREATE TYPE device_status_enum AS ENUM (
    'Active',
    'Lost',
    'Stolen',
    'Deactivated',
    'Returned',
    'Released'
);

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- CUSTOMERS TABLE
-- Stores customer information and account status
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    account_status account_status_enum NOT NULL DEFAULT 'Active',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_status_change TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT phone_format CHECK (phone_number ~ '^\+?[0-9\-\(\)\s]{7,20}$')
);

-- Index on email for fast lookups
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_account_status ON customers(account_status);
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);

-- ============================================================================

-- LAPTOPS TABLE
-- Stores device information linked to customers
CREATE TABLE laptops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    
    -- Hardware identifiers
    hardware_uuid VARCHAR(256) NOT NULL UNIQUE,
    device_name VARCHAR(255) NOT NULL,
    
    -- Device specifications
    total_device_cost DECIMAL(12, 2) NOT NULL,
    device_status device_status_enum NOT NULL DEFAULT 'Active',
    
    -- Hardware details (for offline verification)
    bios_serial_number VARCHAR(255),
    mac_address VARCHAR(17),
    processor_info VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign key constraint
    CONSTRAINT fk_laptops_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Constraints
    CONSTRAINT total_device_cost_positive CHECK (total_device_cost > 0),
    CONSTRAINT hardware_uuid_not_empty CHECK (hardware_uuid != '')
);

-- PRIMARY INDEXES (Performance critical)
CREATE INDEX idx_laptops_hardware_uuid ON laptops(hardware_uuid);
CREATE INDEX idx_laptops_customer_id ON laptops(customer_id);

-- SECONDARY INDEXES
CREATE INDEX idx_laptops_device_status ON laptops(device_status);
CREATE INDEX idx_laptops_created_at ON laptops(created_at DESC);
CREATE INDEX idx_laptops_bios_serial ON laptops(bios_serial_number) WHERE bios_serial_number IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_laptops_customer_status ON laptops(customer_id, device_status);

-- ============================================================================

-- FINANCING CONTRACTS TABLE
-- Stores financing agreement details and payment tracking
CREATE TABLE financing_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laptop_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    
    -- Payment tracking
    total_contract_amount DECIMAL(12, 2) NOT NULL,
    amount_paid_to_date DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    amount_remaining DECIMAL(12, 2) GENERATED ALWAYS AS (total_contract_amount - amount_paid_to_date) STORED,
    
    -- Contract terms
    contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_expiration_year INTEGER NOT NULL,
    target_expiration_month INTEGER NOT NULL,
    contract_status contract_status_enum NOT NULL DEFAULT 'Active',
    
    -- Payment terms
    monthly_payment_amount DECIMAL(12, 2) NOT NULL,
    payment_frequency VARCHAR(50) DEFAULT 'Monthly',
    next_payment_due_date DATE,
    
    -- Time-token system (offline verification)
    current_time_token VARCHAR(8),
    time_token_issued_at TIMESTAMP WITH TIME ZONE,
    time_token_expires_at TIMESTAMP WITH TIME ZONE,
    release_token VARCHAR(8),
    release_token_issued_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_status_change TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign key constraints
    CONSTRAINT fk_financing_laptop 
        FOREIGN KEY (laptop_id) 
        REFERENCES laptops(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_financing_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Constraints
    CONSTRAINT total_amount_positive CHECK (total_contract_amount > 0),
    CONSTRAINT amount_paid_non_negative CHECK (amount_paid_to_date >= 0),
    CONSTRAINT amount_paid_not_exceeds_total CHECK (amount_paid_to_date <= total_contract_amount),
    CONSTRAINT monthly_payment_positive CHECK (monthly_payment_amount > 0),
    CONSTRAINT valid_expiration_month CHECK (target_expiration_month >= 1 AND target_expiration_month <= 12),
    CONSTRAINT valid_expiration_year CHECK (target_expiration_year >= EXTRACT(YEAR FROM CURRENT_DATE)),
    CONSTRAINT time_token_length CHECK (char_length(current_time_token) = 8 OR current_time_token IS NULL),
    CONSTRAINT release_token_length CHECK (char_length(release_token) = 8 OR release_token IS NULL)
);

-- PRIMARY INDEXES (Performance critical)
CREATE INDEX idx_financing_laptop_id ON financing_contracts(laptop_id);
CREATE INDEX idx_financing_customer_id ON financing_contracts(customer_id);

-- SECONDARY INDEXES
CREATE INDEX idx_financing_contract_status ON financing_contracts(contract_status);
CREATE INDEX idx_financing_time_token ON financing_contracts(current_time_token) WHERE current_time_token IS NOT NULL;
CREATE INDEX idx_financing_next_payment ON financing_contracts(next_payment_due_date) WHERE contract_status = 'Active';
CREATE INDEX idx_financing_created_at ON financing_contracts(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_financing_customer_status ON financing_contracts(customer_id, contract_status);
CREATE INDEX idx_financing_laptop_customer ON financing_contracts(laptop_id, customer_id);

-- ============================================================================

-- PAYMENT HISTORY TABLE (Supporting entity)
-- Tracks all payment transactions for audit trail
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    
    -- Payment details
    payment_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_reference VARCHAR(255) UNIQUE,
    paystack_reference VARCHAR(255) UNIQUE,
    
    -- Payment status
    payment_status VARCHAR(50) DEFAULT 'Completed',
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    -- Foreign keys
    CONSTRAINT fk_payment_contract 
        FOREIGN KEY (contract_id) 
        REFERENCES financing_contracts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_payment_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Constraints
    CONSTRAINT payment_amount_positive CHECK (payment_amount > 0)
);

CREATE INDEX idx_payment_contract_id ON payment_history(contract_id);
CREATE INDEX idx_payment_customer_id ON payment_history(customer_id);
CREATE INDEX idx_payment_date ON payment_history(payment_date DESC);
CREATE INDEX idx_payment_status ON payment_history(payment_status);
CREATE INDEX idx_payment_paystack_ref ON payment_history(paystack_reference) WHERE paystack_reference IS NOT NULL;

-- ============================================================================

-- TIME TOKEN LOG TABLE (For offline sync)
-- Tracks issued time tokens for verification and replay attack prevention
CREATE TABLE time_token_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    
    -- Token details
    time_token VARCHAR(8) NOT NULL UNIQUE,
    token_issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    
    -- Status tracking
    was_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    issued_by VARCHAR(100),
    revoked_by VARCHAR(100),
    revocation_reason VARCHAR(255),
    
    -- Foreign keys
    CONSTRAINT fk_token_contract 
        FOREIGN KEY (contract_id) 
        REFERENCES financing_contracts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_token_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    CONSTRAINT token_length CHECK (char_length(time_token) = 8)
);

CREATE INDEX idx_token_log_contract ON time_token_log(contract_id);
CREATE INDEX idx_token_log_customer ON time_token_log(customer_id);
CREATE INDEX idx_token_log_token ON time_token_log(time_token);
CREATE INDEX idx_token_log_expiry ON time_token_log(token_expires_at);
CREATE INDEX idx_token_log_status ON time_token_log(is_revoked, was_used);

-- ============================================================================

-- AUDIT LOG TABLE (Compliance & Security)
-- Captures all system changes for compliance and forensics
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    customer_id UUID,
    
    -- Change details
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    change_reason VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    ip_address INET,
    user_agent VARCHAR(500),
    
    -- Constraints
    CONSTRAINT fk_audit_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_customer ON audit_log(customer_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_created_by ON audit_log(created_by);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active Contracts Overview
CREATE OR REPLACE VIEW v_active_contracts AS
SELECT 
    fc.id as contract_id,
    c.id as customer_id,
    c.full_name,
    c.email,
    l.device_name,
    fc.total_contract_amount,
    fc.amount_paid_to_date,
    fc.amount_remaining,
    fc.contract_status,
    c.account_status,
    fc.next_payment_due_date,
    (fc.next_payment_due_date - CURRENT_DATE) as days_until_payment,
    CASE 
        WHEN fc.next_payment_due_date < CURRENT_DATE THEN 'Overdue'
        WHEN fc.next_payment_due_date - CURRENT_DATE <= 3 THEN 'Due Soon'
        ELSE 'On Schedule'
    END as payment_status
FROM financing_contracts fc
JOIN customers c ON fc.customer_id = c.id
JOIN laptops l ON fc.laptop_id = l.id
WHERE fc.contract_status = 'Active'
    AND l.device_status = 'Active'
ORDER BY fc.next_payment_due_date;

-- Delinquent Accounts
CREATE OR REPLACE VIEW v_delinquent_accounts AS
SELECT 
    c.id,
    c.full_name,
    c.email,
    c.phone_number,
    c.account_status,
    COUNT(fc.id) as active_contracts,
    SUM(fc.amount_remaining) as total_outstanding,
    MAX(fc.next_payment_due_date) as earliest_overdue_date
FROM customers c
LEFT JOIN financing_contracts fc ON c.id = fc.customer_id
WHERE c.account_status = 'Delinquent'
GROUP BY c.id, c.full_name, c.email, c.phone_number, c.account_status;

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- Function to generate 8-digit time token
CREATE OR REPLACE FUNCTION generate_time_token()
RETURNS VARCHAR(8) AS $$
DECLARE
    token VARCHAR(8);
    exists_token BOOLEAN;
BEGIN
    LOOP
        -- Generate random 8-digit token
        token := TO_CHAR(floor(random() * 100000000), 'FM00000000');
        
        -- Check if token already exists
        SELECT EXISTS(
            SELECT 1 FROM time_token_log WHERE time_token = token AND is_revoked = FALSE
        ) INTO exists_token;
        
        EXIT WHEN NOT exists_token;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to verify time token
CREATE OR REPLACE FUNCTION verify_time_token(
    p_contract_id UUID,
    p_time_token VARCHAR(8)
) RETURNS TABLE(is_valid BOOLEAN, reason VARCHAR(255)) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN ttl.time_token IS NULL THEN FALSE
            WHEN ttl.is_revoked THEN FALSE
            WHEN ttl.was_used THEN FALSE
            WHEN ttl.token_expires_at < CURRENT_TIMESTAMP THEN FALSE
            ELSE TRUE
        END as is_valid,
        CASE 
            WHEN ttl.time_token IS NULL THEN 'Token not found'
            WHEN ttl.is_revoked THEN 'Token has been revoked'
            WHEN ttl.was_used THEN 'Token already used'
            WHEN ttl.token_expires_at < CURRENT_TIMESTAMP THEN 'Token expired'
            ELSE 'Valid'
        END as reason
    FROM time_token_log ttl
    WHERE ttl.contract_id = p_contract_id 
        AND ttl.time_token = p_time_token;
END;
$$ LANGUAGE plpgsql;

-- Function to update customer account status
CREATE OR REPLACE FUNCTION update_account_status(
    p_customer_id UUID,
    p_new_status account_status_enum,
    p_changed_by VARCHAR(100)
) RETURNS VOID AS $$
BEGIN
    UPDATE customers
    SET 
        account_status = p_new_status,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_changed_by,
        last_status_change = CURRENT_TIMESTAMP
    WHERE id = p_customer_id;
    
    -- Update related contracts
    UPDATE financing_contracts
    SET 
        contract_status = p_new_status,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_changed_by,
        last_status_change = CURRENT_TIMESTAMP
    WHERE customer_id = p_customer_id;
    
    -- Log the change
    INSERT INTO audit_log (entity_type, entity_id, customer_id, action, new_values, created_by)
    VALUES ('customers', p_customer_id, p_customer_id, 'STATUS_UPDATE', 
            jsonb_build_object('new_status', p_new_status), p_changed_by);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_update_timestamp
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_laptops_update_timestamp
BEFORE UPDATE ON laptops
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_financing_update_timestamp
BEFORE UPDATE ON financing_contracts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Auto-calculate remaining amount
CREATE OR REPLACE FUNCTION sync_financing_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update contract status based on payment progress
    IF NEW.amount_paid_to_date >= NEW.total_contract_amount THEN
        NEW.contract_status = 'Fully_Paid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_financing_sync_status
BEFORE UPDATE ON financing_contracts
FOR EACH ROW
EXECUTE FUNCTION sync_financing_status();

-- ============================================================================
-- SECURITY & PERMISSIONS (Optional - Configure based on your setup)
-- ============================================================================

-- Create roles (uncomment and customize as needed)
/*
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password_here';
CREATE ROLE app_admin WITH LOGIN PASSWORD 'secure_admin_password';

GRANT CONNECT ON DATABASE your_database TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
*/

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================

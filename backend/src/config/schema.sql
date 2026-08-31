-- ============================================
-- RecoverAI Database Schema
-- ============================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    segment VARCHAR(50) NOT NULL,
    lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    communication_preference VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    opted_out BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments / Transactions
CREATE TABLE IF NOT EXISTS payments (
    transaction_id VARCHAR(100) PRIMARY KEY,
    customer_id VARCHAR(50),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    failure_reason VARCHAR(100),
    recoverability VARCHAR(30),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    recovered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE SET NULL
);

-- Recovery decisions / attempts
CREATE TABLE IF NOT EXISTS recoveries (
    recovery_id VARCHAR(100) PRIMARY KEY,
    payment_id VARCHAR(100) NOT NULL,
    risk_score NUMERIC(5, 2),
    recovery_probability NUMERIC(5, 4),
    recommended_action VARCHAR(100),
    actual_action VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    recovered_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recovery_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(transaction_id)
        ON DELETE CASCADE
);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_events (
    event_id VARCHAR(100) PRIMARY KEY,
    payment_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    agent VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    reason TEXT,
    result VARCHAR(100),

    CONSTRAINT fk_audit_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(transaction_id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_customer
    ON payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON payments(status);

CREATE INDEX IF NOT EXISTS idx_payments_failure_reason
    ON payments(failure_reason);

CREATE INDEX IF NOT EXISTS idx_recoveries_payment
    ON recoveries(payment_id);

CREATE INDEX IF NOT EXISTS idx_audit_payment
    ON audit_events(payment_id);
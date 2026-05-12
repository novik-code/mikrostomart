-- ============================================
-- Migration 121: Orders state machine
-- ============================================
-- Date: 2026-05-12
-- Sprint: Hotfix S2-1 (Payment Integrity)
-- Refs: PLAN_HOTFIX_SPRINT.md S2-1, audit P0-06 + P0-07
--
-- BEFORE: orders.status is a free-form text column. The client sends
-- { status: 'paid' } in /api/order-confirmation and the row is created
-- as 'paid' on trust. There is no idempotency, no provider linkage, no
-- server-side total. P0-06: payment flow trusts client amount/status.
--
-- AFTER:
--   - status has CHECK constraint over a known state machine
--   - amount_total is the server-calculated source of truth (set when
--     creating the pending order in S2-2)
--   - amount_paid comes from the verified webhook (S2-3)
--   - provider_order_id stores Stripe PI id / PayU orderId / P24 sessionId
--     for webhook → order lookup
--   - idempotency_key (UNIQUE) prevents duplicate orders on retry
--   - payment_provider records who confirmed the payment
--
-- Status state machine (transitions enforced in code, not DB):
--   pending → paid       (provider webhook with valid signature + matching amount)
--   pending → failed     (provider webhook with failure status)
--   pending → cancelled  (admin or user abandons)
--   paid    → refunded   (admin issues refund)
--
-- Idempotency: at insert time the route generates a key (uuid). If the
-- client retries the same request, the unique index makes the second
-- INSERT fail and the handler returns the existing row.
--
-- This migration is IDEMPOTENT. Safe to run twice. Safe to run against
-- a fresh `orders` table or an existing one with `status='paid'` rows.

-- ============================================
-- 1. Add new columns (nullable so existing rows survive)
-- ============================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_total NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. Backfill: every legacy row was implicitly 'paid'
-- ============================================
-- Older rows used the free-form text `status` and the old `total_amount`
-- column. Migrate them so the new constraint passes:
--   - if status NULL/empty → set to 'paid' (legacy assumption)
--   - amount_total: copy from total_amount when missing
--   - amount_paid: same (we trust legacy totals)

UPDATE orders
SET status = 'paid'
WHERE status IS NULL OR status = '' OR status NOT IN ('pending', 'paid', 'failed', 'refunded', 'cancelled');

UPDATE orders
SET amount_total = total_amount
WHERE amount_total IS NULL AND total_amount IS NOT NULL;

UPDATE orders
SET amount_paid = total_amount
WHERE amount_paid IS NULL AND status = 'paid' AND total_amount IS NOT NULL;

-- ============================================
-- 3. Enforce state machine on status column
-- ============================================
-- Drop the old CHECK if a previous run added it under a different name,
-- then add the canonical one.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_status_check'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_status_check;
    END IF;
END $$;

ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));

-- Default future rows to 'pending' (S2-2 will create rows pre-payment).
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================
-- 4. Indexes for the new lookup patterns
-- ============================================

-- Webhook handler resolves provider_order_id → orders.id
CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id
    ON orders(provider_order_id)
    WHERE provider_order_id IS NOT NULL;

-- Admin filters by status (e.g. "show pending unpaid orders")
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Idempotency: enforce uniqueness when present, NULL allowed for legacy rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
    ON orders(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ============================================
-- 5. updated_at trigger — set on every row touch
-- ============================================

CREATE OR REPLACE FUNCTION set_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_orders_updated_at();

-- ============================================
-- 6. Status-change audit trigger — placeholder for S8-3
-- ============================================
-- S8-3 will introduce the audit_log table. Until then this function is a
-- no-op shim that checks for the table at runtime and silently skips when
-- it does not exist. After S8-3 (migration 124) the trigger starts writing
-- without any code change here.

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire when status actually changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Defensive: skip if audit_log doesn't exist yet (pre-S8-3)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'audit_log'
        ) THEN
            EXECUTE format(
                'INSERT INTO audit_log (action, target_table, target_id, metadata, timestamp) '
                'VALUES ($1, $2, $3, $4, NOW())'
            )
            USING
                'order_status_change',
                'orders',
                NEW.id::text,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'amount_total', NEW.amount_total,
                    'amount_paid', NEW.amount_paid,
                    'provider', NEW.payment_provider,
                    'provider_order_id', NEW.provider_order_id
                );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_status_audit ON orders;
CREATE TRIGGER trg_orders_status_audit
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();

-- ============================================
-- 7. Column comments — document the contract
-- ============================================

COMMENT ON COLUMN orders.status IS
    'State machine: pending → paid|failed|cancelled; paid → refunded. Transitions enforced in application code (S2-2/S2-3).';
COMMENT ON COLUMN orders.payment_provider IS
    'Which provider confirmed payment: stripe | payu | p24. NULL while pending.';
COMMENT ON COLUMN orders.provider_order_id IS
    'Provider-side identifier: Stripe PaymentIntent.id / PayU orderId / P24 sessionId. Used by webhook to look up the local order.';
COMMENT ON COLUMN orders.idempotency_key IS
    'Client-generated nonce (uuid) to dedupe retries. Unique when present, NULL on legacy rows.';
COMMENT ON COLUMN orders.amount_total IS
    'Server-calculated total in PLN (10,2). Source of truth — verified against webhook amount_paid.';
COMMENT ON COLUMN orders.amount_paid IS
    'Amount actually paid per provider webhook. Should match amount_total within tolerance 0 (S2-3 enforces).';

-- ============================================
-- 8. Verification — manual check after running
-- ============================================
-- Expected after this migration:
--   - SELECT status, COUNT(*) FROM orders GROUP BY status → only known values
--   - SELECT column_name FROM information_schema.columns WHERE table_name='orders'
--     → includes payment_provider, provider_order_id, idempotency_key,
--       amount_total, amount_paid, updated_at
--   - SELECT * FROM pg_indexes WHERE tablename='orders'
--     → includes idx_orders_status, idx_orders_provider_order_id,
--       idx_orders_idempotency_key
--   - SELECT tgname FROM pg_trigger WHERE tgrelid='orders'::regclass
--     → trg_orders_updated_at, trg_orders_status_audit

SELECT
    'migration_121' AS migration,
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE status = 'paid') AS paid_orders,
    COUNT(*) FILTER (WHERE amount_total IS NOT NULL) AS with_amount_total,
    COUNT(*) FILTER (WHERE idempotency_key IS NOT NULL) AS with_idempotency_key
FROM orders;

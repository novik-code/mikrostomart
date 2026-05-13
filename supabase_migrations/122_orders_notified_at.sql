-- ============================================
-- Migration 122: orders.notified_at — notification idempotency
-- ============================================
-- Date: 2026-05-13
-- Sprint: Hotfix S2-4 (Payment Integrity follow-up to S2-3)
-- Refs: PLAN_HOTFIX_SPRINT.md S2-4
--
-- After S2-3 the order-confirmation endpoint is polled by two frontend
-- paths:
--   - /platnosc (PayU/P24 return URL) — useEffect, 10 retries × 2s
--   - CheckoutForm.handlePaymentSuccess (Stripe embedded success) — same
--     polling pattern
-- Each retry hits /api/order-confirmation, which sends the admin email,
-- buyer email, Telegram and push. Without an idempotency marker the same
-- order could send 2–3 emails as the webhook lands mid-poll and one of
-- the retries returns 200 + sends, then the next retry returns 200 +
-- sends again.
--
-- This migration adds `orders.notified_at TIMESTAMPTZ`. The order-confirmation
-- endpoint sets it inside the same UPDATE that confirms status='paid'
-- already happened, and skips the notification side-effects when it's
-- already set. Atomic via .eq('notified_at', null) — first poll wins.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, safe to re-run.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.notified_at IS
    'Set by /api/order-confirmation the first time it sees status=paid and sends emails/Telegram/push. Subsequent polls see notified_at != null and skip. Atomic via UPDATE ... WHERE notified_at IS NULL.';

-- Optional: index used only if we ever query "unconfirmed paid orders"
-- (admin dashboard could surface "paid but never notified" as a warning).
-- Partial — only paid rows.
CREATE INDEX IF NOT EXISTS idx_orders_notified_at
    ON orders(notified_at)
    WHERE status = 'paid';

-- ============================================
-- Verification — manual check after running
-- ============================================
SELECT
    'migration_122' AS migration,
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE notified_at IS NOT NULL) AS already_notified,
    COUNT(*) FILTER (WHERE status = 'paid' AND notified_at IS NULL) AS paid_but_not_notified
FROM orders;

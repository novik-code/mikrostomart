-- Migration 123: track Prodentis "patient confirmed" icon sync status on appointment_actions
--
-- Context: when patient clicks SMS confirmation link, we POST to Prodentis proxy
-- /api/schedule/appointment/{id}/icon. This used to silently fail (return 200 OK to
-- the patient with iconAdded:false in the JSON nobody reads). On 2026-05-13 we
-- traced a recurring 404 to reception moving/cancelling appointments in Prodentis
-- desktop — Prodentis soft-deletes the old row (deleted=1) and creates a new one
-- with a NEW id_schedule. Our stored prodentis_id goes stale.
--
-- This migration adds columns to record the outcome of the icon-sync call, so:
--   1. We can show a "Prodentis ✅/❌" badge in admin alongside "Patient clicked"
--   2. We can list rows where sync failed for manual reconciliation
--   3. We can alert via Telegram with persistent context (not just a one-shot log)
--
-- Idempotent: all ADD COLUMN clauses use IF NOT EXISTS.

ALTER TABLE appointment_actions
    ADD COLUMN IF NOT EXISTS prodentis_icon_synced BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prodentis_icon_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS prodentis_icon_error TEXT;

-- Lookup for the admin "failed sync" view (rare query, small footprint).
CREATE INDEX IF NOT EXISTS idx_appointment_actions_icon_sync_failed
    ON appointment_actions (attendance_confirmed, prodentis_icon_synced)
    WHERE attendance_confirmed = TRUE AND prodentis_icon_synced = FALSE;

COMMENT ON COLUMN appointment_actions.prodentis_icon_synced IS
    'TRUE once POST /api/schedule/appointment/{id}/icon to proxy returned 200 (possibly after ID refresh). Defaults FALSE; only set TRUE explicitly.';
COMMENT ON COLUMN appointment_actions.prodentis_icon_synced_at IS
    'Timestamp of successful icon write to Prodentis. NULL until first success.';
COMMENT ON COLUMN appointment_actions.prodentis_icon_error IS
    'Last error reason if sync failed (e.g. "404:not_found", "appointment_cancelled", "no_api_key"). Cleared on success.';

-- Migration 114: cancellation columns na time_entries
-- Pracownik może anulować swój wpis z dziś z notatką (powód) — soft-delete.
-- Wszystkie funkcje liczące (sumy, auto-detekcja typu, dedup) pomijają anulowane.

ALTER TABLE time_entries
    ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_time_entries_active_employee_date
    ON time_entries(employee_id, scanned_at DESC)
    WHERE cancelled = false;

-- Trigger anti-fraud (z migracji 113) musi pomijać anulowane wpisy w sprawdzaniu duplikatów.
CREATE OR REPLACE FUNCTION check_time_entry_dedup() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.manual OR NEW.cancelled THEN
        RETURN NEW;
    END IF;
    IF EXISTS (
        SELECT 1 FROM time_entries
        WHERE employee_id = NEW.employee_id
          AND type = NEW.type
          AND cancelled = false
          AND scanned_at > NEW.scanned_at - INTERVAL '60 seconds'
          AND scanned_at < NEW.scanned_at + INTERVAL '60 seconds'
          AND id <> NEW.id
    ) THEN
        RAISE EXCEPTION 'Duplicate time entry within 60s window for employee % type %', NEW.employee_id, NEW.type
            USING ERRCODE = 'unique_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

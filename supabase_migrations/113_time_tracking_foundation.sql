-- Migration 113: Time Tracking Foundation
-- Tworzy podstawy systemu rejestracji czasu pracy:
--   - work_locations (lokalizacje QR, sekrety do HMAC-TOTP)
--   - time_entries (wpisy clock-in / clock-out)
-- F1 z planu KCP (~/Desktop/PLAN_TIME_TRACKING_v1.md)

-- =============================================================================
-- 1. work_locations
-- =============================================================================
CREATE TABLE IF NOT EXISTS work_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    qr_secret TEXT NOT NULL,
    rotation_seconds INTEGER NOT NULL DEFAULT 30 CHECK (rotation_seconds BETWEEN 10 AND 300),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_locations_active ON work_locations(is_active) WHERE is_active = true;

-- Tylko jedna lokalizacja może być oznaczona jako primary
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_locations_primary
    ON work_locations(is_primary) WHERE is_primary = true;

-- Seed domyślnej lokalizacji (jedna na klinikę, qr_secret losowy z DB)
INSERT INTO work_locations (name, address, qr_secret, is_primary)
SELECT
    'Klinika Mikrostomart',
    'ul. Centralna 33a, 45-046 Opole',
    encode(gen_random_bytes(32), 'hex'),
    true
WHERE NOT EXISTS (SELECT 1 FROM work_locations);

-- RLS: service_role only (qr_secret nigdy nie wycieka do klienta)
ALTER TABLE work_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_locations_service_only ON work_locations;
CREATE POLICY work_locations_service_only ON work_locations
    FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 2. time_entries
-- =============================================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('clock_in', 'clock_out')),
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location_id UUID REFERENCES work_locations(id) ON DELETE SET NULL,

    -- Audyt skanowania QR (anty-fraud)
    qr_token_used TEXT,
    qr_period BIGINT,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,

    -- Korekty admina
    manual BOOLEAN NOT NULL DEFAULT false,
    manual_correction_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    manual_note TEXT,
    original_scanned_at TIMESTAMPTZ,  -- jeśli admin zmienił czas, tutaj oryginał

    -- Wiązanie do planowanej zmiany (FK pojawi się w migracji 114)
    schedule_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date
    ON time_entries(employee_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_unprocessed
    ON time_entries(scanned_at) WHERE schedule_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_location_date
    ON time_entries(location_id, scanned_at DESC);

-- Constraint: nie pozwalaj na 2 wpisy tego samego typu w 60s window dla tego samego pracownika
-- (tap-protection na poziomie DB, druga warstwa po dedup w API)
CREATE OR REPLACE FUNCTION check_time_entry_dedup() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.manual THEN
        -- Korekty admina pomijamy
        RETURN NEW;
    END IF;
    IF EXISTS (
        SELECT 1 FROM time_entries
        WHERE employee_id = NEW.employee_id
          AND type = NEW.type
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

DROP TRIGGER IF EXISTS time_entries_dedup_trigger ON time_entries;
CREATE TRIGGER time_entries_dedup_trigger
    BEFORE INSERT ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_time_entry_dedup();

-- RLS: service_role only (wszystkie operacje przez API z auth + walidacją po naszej stronie)
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS time_entries_service_only ON time_entries;
CREATE POLICY time_entries_service_only ON time_entries
    FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 3. updated_at trigger dla work_locations
-- =============================================================================
CREATE OR REPLACE FUNCTION update_work_locations_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS work_locations_updated_at_trigger ON work_locations;
CREATE TRIGGER work_locations_updated_at_trigger
    BEFORE UPDATE ON work_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_work_locations_updated_at();

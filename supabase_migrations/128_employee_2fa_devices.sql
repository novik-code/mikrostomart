-- Migration 128: Multi-device 2FA support
-- Allows multiple TOTP devices per employee (shared account scenarios like
-- gabinet@mikrostomart.pl used by 3+ receptionists, each with own authenticator).
--
-- Design:
--   - Nowa tabela employee_2fa_devices: N devices per employee, każdy z własnym secret
--   - employees.totp_secret + totp_enabled + totp_setup_at + totp_verified_at +
--     totp_last_used_at — zachowane jako legacy/cache (totp_enabled aktualizowane
--     przez trigger po każdej zmianie w employee_2fa_devices)
--   - employees.totp_backup_codes — SHARED per account (jeden zestaw 8 kodów,
--     niezależny od devices). Backup codes = fallback "zgubiłem wszystkie telefony".
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS employee_2fa_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    totp_secret TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(employee_id, device_name)
);

CREATE INDEX IF NOT EXISTS idx_emp_2fa_devices_emp
    ON employee_2fa_devices(employee_id);

CREATE INDEX IF NOT EXISTS idx_emp_2fa_devices_enabled
    ON employee_2fa_devices(employee_id, enabled)
    WHERE enabled = true;

-- Backfill: dla każdego employee z istniejącym totp_secret (mig 126), tworzymy
-- device row "Urządzenie 1" z tym samym sekretem. Wszyscy obecni 2FA-users
-- (Marcin, gabinet@, Justyna, Elżbieta) widzą swoje istniejące 2FA jako pierwszy
-- device i mogą dodawać kolejne bez resetu.
INSERT INTO employee_2fa_devices (employee_id, device_name, totp_secret, enabled, created_at, last_used_at)
SELECT
    id,
    'Urządzenie 1',
    totp_secret,
    totp_enabled,
    COALESCE(totp_setup_at, NOW()),
    totp_last_used_at
FROM employees
WHERE totp_secret IS NOT NULL
ON CONFLICT (employee_id, device_name) DO NOTHING;

-- Trigger: utrzymuje employees.totp_enabled jako cache "any device enabled".
-- Middleware (enforce2FA) używa tego pola dla fast check bez JOIN-a.
CREATE OR REPLACE FUNCTION sync_employee_totp_enabled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    emp_id UUID;
BEGIN
    emp_id := COALESCE(NEW.employee_id, OLD.employee_id);
    UPDATE employees
    SET totp_enabled = EXISTS(
        SELECT 1 FROM employee_2fa_devices
        WHERE employee_id = emp_id
          AND enabled = true
    )
    WHERE id = emp_id;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_emp_totp_enabled ON employee_2fa_devices;
CREATE TRIGGER trg_sync_emp_totp_enabled
AFTER INSERT OR UPDATE OR DELETE ON employee_2fa_devices
FOR EACH ROW EXECUTE FUNCTION sync_employee_totp_enabled();

-- RLS: service_role only (anon/authenticated denied by default — no policies)
ALTER TABLE employee_2fa_devices ENABLE ROW LEVEL SECURITY;

-- Documentation
COMMENT ON TABLE employee_2fa_devices IS 'Multi-device 2FA support. Każdy employee może mieć N urządzeń z różnymi TOTP secrets. Backup codes nadal w employees.totp_backup_codes (shared per account).';
COMMENT ON COLUMN employee_2fa_devices.device_name IS 'User-friendly nazwa, np. "Justyna iPhone", "Recepcja iPad". UNIQUE per employee.';
COMMENT ON COLUMN employee_2fa_devices.totp_secret IS 'Base32 TOTP secret per device. Plain text — Supabase encrypts at rest. Pending column-level encryption w S8-7 (pgcrypto).';
COMMENT ON COLUMN employee_2fa_devices.enabled IS 'true po verifyAndEnable. false = setup w toku (secret stworzony ale code not yet verified).';
COMMENT ON COLUMN employee_2fa_devices.last_used_at IS 'Updated przy każdym verifyChallenge match z tym device.';

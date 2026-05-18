-- Migration 129: Passkeys (WebAuthn) — biometric authentication
--
-- FaceID/TouchID/Windows Hello/Android biometrics jako alternatywa dla TOTP.
-- User registruje "passkey" — sekret kryptograficzny przechowywany w Secure
-- Enclave urządzenia (nie da się go skraść/skopiować). Login: prompt o biometrię
-- → urządzenie podpisuje challenge → server weryfikuje.
--
-- Po pomyślnej authentykacji passkey'em → ten sam `mfa_session` cookie jak TOTP
-- → middleware nie wie skąd przyszło. Passkey jest ALTERNATYWĄ dla TOTP, nie
-- zamiennikiem. User wybiera co woli używać przy logowaniu.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS employee_passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    -- credential_id: WebAuthn credential ID (base64url-encoded by SimpleWebAuthn)
    -- Unique globally (nie tylko per employee) bo browser może odrzucić rejestrację
    -- jeśli ta sama credential jest już zarejestrowana — anti-duplicate.
    credential_id TEXT NOT NULL UNIQUE,
    -- public_key: COSE-encoded public key (Uint8Array → base64url for storage)
    public_key TEXT NOT NULL,
    -- counter: WebAuthn signature counter. Każda authentykacja inkrementuje counter
    -- po stronie urządzenia. Server rejectuje jeśli nowy counter <= zapisanemu
    -- (anti-replay). 0 = device nie wspiera counterów (np. niektóre Apple/Google
    -- platform authenticators); wtedy counter check disabled.
    counter BIGINT NOT NULL DEFAULT 0,
    -- transports: jak credential może być dostarczony do browsera.
    -- "internal" = platform authenticator (FaceID/TouchID/Windows Hello on same device)
    -- "hybrid" = cross-device (phone QR scan z laptopa)
    -- "usb", "nfc", "ble" = security keys (YubiKey etc.)
    transports TEXT[] NOT NULL DEFAULT '{}',
    -- device_type: 'singleDevice' | 'multiDevice' (z attestation w registration)
    -- multiDevice = passkey sync'owany przez iCloud Keychain / Google Password Mgr
    device_type TEXT,
    -- backed_up: czy credential jest backupowany przez platform (iCloud/Google sync)
    -- Synced passkeys są "phishing-resistant" + recovery-friendly. Hardware keys
    -- (YubiKey) nie są backed up — user musi mieć drugi key jako backup.
    backed_up BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(employee_id, device_name)
);

CREATE INDEX IF NOT EXISTS idx_emp_passkeys_emp
    ON employee_passkeys(employee_id);

CREATE INDEX IF NOT EXISTS idx_emp_passkeys_cred
    ON employee_passkeys(credential_id);

-- RLS: service_role only (anon/authenticated denied by default — no policies)
ALTER TABLE employee_passkeys ENABLE ROW LEVEL SECURITY;

-- Documentation
COMMENT ON TABLE employee_passkeys IS 'Passkeys (WebAuthn) dla biometric login. Alternatywa dla TOTP — user wybiera metodę przy logowaniu. Phishing-resistant (challenge bound to mikrostomart.pl domain).';
COMMENT ON COLUMN employee_passkeys.device_name IS 'User-friendly nazwa, np. "iPhone — FaceID", "MacBook Touch ID". UNIQUE per employee.';
COMMENT ON COLUMN employee_passkeys.credential_id IS 'WebAuthn credential ID — base64url string. Unique globally (nie tylko per employee) bo browser anti-duplicate check.';
COMMENT ON COLUMN employee_passkeys.public_key IS 'COSE-encoded public key (base64url). Server używa do weryfikacji signature przy authentication.';
COMMENT ON COLUMN employee_passkeys.counter IS 'WebAuthn signature counter (anti-replay). 0 = device nie wspiera counterów (Apple/Google platform authenticators).';
COMMENT ON COLUMN employee_passkeys.transports IS 'Hints jak credential może być dostarczony: internal (platform FaceID/TouchID/Hello), hybrid (cross-device QR), usb/nfc/ble (security keys).';
COMMENT ON COLUMN employee_passkeys.backed_up IS 'true = synced przez iCloud Keychain / Google Password Mgr (multi-device, recovery-friendly). false = hardware key (YubiKey) lub no-sync platform.';

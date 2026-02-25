-- Migration 054: patient_intake_tokens — jednorazowe tokeny do cyfrowej karty pacjenta
-- Używane przez system e-karta: recepcjonistka generuje token, pacjent skanuje QR

CREATE TABLE IF NOT EXISTS patient_intake_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,

  -- Pre-fill jeśli pacjent już istnieje w Prodentis
  prodentis_patient_id TEXT,       -- NULL → nowy pacjent
  prefill_first_name TEXT,
  prefill_last_name TEXT,

  -- Powiązanie z wizytą w grafiku (opcjonalne)
  appointment_id TEXT,             -- ID wizyty z Prodentis
  appointment_date TEXT,
  appointment_type TEXT,

  -- Status tokenu
  used_at TIMESTAMPTZ,             -- NULL = nieużyty
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_by_employee TEXT,        -- e-mail pracownika który wygenerował
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: tylko service_role (Next.js server API) ma dostęp
ALTER TABLE patient_intake_tokens ENABLE ROW LEVEL SECURITY;
-- Brak polityk = anon/authenticated zablokowany, service_role bypasses

-- Index na token (wyszukiwanie po tokenie przy weryfikacji)
CREATE INDEX IF NOT EXISTS idx_patient_intake_tokens_token
  ON patient_intake_tokens (token)
  WHERE used_at IS NULL;

-- Index na wygasłe tokeny (cleanup)
CREATE INDEX IF NOT EXISTS idx_patient_intake_tokens_expires
  ON patient_intake_tokens (expires_at);

-- Tabela na wypełnione dane pacjentów z e-karty
-- (przed przekazaniem do Prodentis — bufor + historia)
CREATE TABLE IF NOT EXISTS patient_intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES patient_intake_tokens(id),

  -- Dane osobowe
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  maiden_name TEXT,
  pesel TEXT,
  birth_date DATE,
  gender TEXT,                     -- 'M' lub 'F'

  -- Dane kontaktowe
  street TEXT,
  postal_code TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,

  -- Zgody
  marketing_consent BOOLEAN DEFAULT false,
  contact_consent BOOLEAN DEFAULT true,
  rodo_consent BOOLEAN DEFAULT true,

  -- Wywiad medyczny (JSON)
  medical_survey JSONB,            -- checkboxy i pola tekstowe wywiadu
  medical_notes TEXT,              -- sformatowany tekst → do Prodentis notes

  -- Status przekazania do Prodentis
  prodentis_status TEXT DEFAULT 'pending',   -- pending | sent | failed
  prodentis_patient_id TEXT,                 -- ID zwrócone przez Prodentis API
  prodentis_error TEXT,

  -- Podpis cyfrowy (base64 canvas)
  signature_data TEXT,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_intake_submissions ENABLE ROW LEVEL SECURITY;
-- Brak polityk = service_role only

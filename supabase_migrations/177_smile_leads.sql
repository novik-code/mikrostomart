-- Migracja 177: smile_leads — leady z symulatora metamorfozy i wyceniarki
-- (aplikacja mobilna; kanał 'web' zarezerwowany na przyszłość — symulator webowy).
-- Zgody: art. 7 RODO — przechowujemy wersję tekstu zgody (consent_text_version)
-- jako dowód, CO dokładnie zaakceptował pacjent.
-- Retencja: 12 miesięcy (cron data-retention-cleanup, wpis smile_leads_old).
-- ZDJĘCIE nie jest zapisywane PO STRONIE KLINIKI (żadna kolumna/Storage/logi);
-- tranzytuje przez dostawcę e-maili transakcyjnych (Resend Inc., USA — SCC/DPA)
-- jako załącznik wysłanej wiadomości. prodentis_id celowo NIEwypełniane przez
-- apkę (zgoda obejmuje e-mail/telefon; kolumna pod przyszły kanał web).

CREATE TABLE IF NOT EXISTS smile_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('metamorfoza', 'wycena')),
  channel TEXT NOT NULL DEFAULT 'app' CHECK (channel IN ('app', 'web')),
  locale TEXT,
  prodentis_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  consent_result BOOLEAN NOT NULL DEFAULT false,
  consent_marketing BOOLEAN NOT NULL DEFAULT false,
  consent_text_version TEXT NOT NULL,
  style TEXT,
  estimate_summary TEXT,
  estimate_min INTEGER,
  estimate_max INTEGER,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT smile_leads_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

ALTER TABLE smile_leads ENABLE ROW LEVEL SECURITY;
-- Brak polityk RLS = dostęp wyłącznie przez service_role (wzorzec mig 132/172).

CREATE INDEX IF NOT EXISTS idx_smile_leads_created_at ON smile_leads (created_at DESC);

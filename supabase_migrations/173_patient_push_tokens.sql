-- Migracja 173: tokeny push aplikacji mobilnej pacjenta (Expo Push Service)
-- Kontekst: apka mobilna rejestruje token przez POST /api/patients/push-token (Bearer).
-- Wysyłka: src/lib/expoPush.ts (wewnątrz pushService.pushToUser dla userType='patient').
-- UWAGA: wgrać na OBA env Supabase PRZED deployem backendu z endpointem.

CREATE TABLE IF NOT EXISTS patient_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL,              -- prodentisId pacjenta (jak w chat_conversations)
    token TEXT NOT NULL UNIQUE,            -- ExponentPushToken[...]
    platform TEXT NOT NULL DEFAULT 'ios',  -- 'ios' | 'android'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_push_tokens_patient
    ON patient_push_tokens (patient_id);

-- RLS on, BEZ polityk → dostęp wyłącznie service_role (wzorzec z audytu 2026-05-18 / mig 172)
ALTER TABLE patient_push_tokens ENABLE ROW LEVEL SECURITY;

-- 061: Add birth_date cache + birthday_wishes tracking
-- birth_date is cached from Prodentis to avoid daily API calls

ALTER TABLE patients ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE TABLE IF NOT EXISTS birthday_wishes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    prodentis_id TEXT NOT NULL,
    patient_name TEXT,
    patient_phone TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    sms_sent BOOLEAN DEFAULT false,
    sms_error TEXT,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    UNIQUE(prodentis_id, year)
);

CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON patients(birth_date);
CREATE INDEX IF NOT EXISTS idx_birthday_wishes_year ON birthday_wishes(year);

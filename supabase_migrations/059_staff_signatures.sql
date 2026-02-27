-- Staff signatures — pre-captured doctor/hygienist signatures for consent PDFs
CREATE TABLE IF NOT EXISTS staff_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'lekarz', -- lekarz, higienistka
    signature_data TEXT NOT NULL, -- base64 PNG data URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_staff_signatures_active ON staff_signatures (is_active, staff_name);

-- RLS
ALTER TABLE staff_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_signatures_all" ON staff_signatures FOR ALL USING (true) WITH CHECK (true);

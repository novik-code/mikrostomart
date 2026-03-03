-- 062: Cancelled appointments tracking table
-- Records all appointments cancelled by patients from the patient zone

CREATE TABLE IF NOT EXISTS cancelled_appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prodentis_appointment_id TEXT,
    patient_name TEXT,
    patient_phone TEXT,
    patient_prodentis_id TEXT,
    appointment_date TIMESTAMPTZ,
    doctor_name TEXT,
    reason TEXT,
    cancelled_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_by TEXT DEFAULT 'patient'  -- 'patient' or 'admin'
);

CREATE INDEX IF NOT EXISTS idx_cancelled_appointments_date ON cancelled_appointments(cancelled_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancelled_appointments_patient ON cancelled_appointments(patient_prodentis_id);

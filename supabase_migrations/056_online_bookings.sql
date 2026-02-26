-- Migration 056: Online Bookings table
-- Tracks appointments booked online, pending admin approval before Prodentis sync.

CREATE TABLE IF NOT EXISTS online_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id),

    -- Patient info
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_email TEXT,

    -- Prodentis patient identification
    prodentis_patient_id TEXT,
    is_new_patient BOOLEAN DEFAULT false,
    patient_match_method TEXT,  -- 'phone+name' | 'new'

    -- Appointment details
    specialist_id TEXT NOT NULL,         -- 'marcin', 'ilona', etc.
    specialist_name TEXT NOT NULL,
    doctor_prodentis_id TEXT,            -- '0100000001', etc.
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_type TEXT,
    description TEXT,

    -- Approval & schedule status
    -- pending → approved → scheduled | failed
    -- pending → rejected
    schedule_status TEXT NOT NULL DEFAULT 'pending',
    schedule_error TEXT,
    prodentis_appointment_id TEXT,       -- set after Prodentis sync
    approved_by TEXT,                    -- admin email
    approved_at TIMESTAMPTZ,

    -- E-karta token (for new patients)
    intake_token_id UUID,
    intake_url TEXT,

    -- Telegram digest tracking
    reported_in_digest BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: service-role only (backend operations)
ALTER TABLE online_bookings ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_online_bookings_status ON online_bookings(schedule_status);
CREATE INDEX idx_online_bookings_date ON online_bookings(appointment_date);
CREATE INDEX idx_online_bookings_digest ON online_bookings(reported_in_digest) WHERE reported_in_digest = false;

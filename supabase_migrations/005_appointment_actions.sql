-- Migration: Create appointment_actions table
-- Purpose: Track patient appointment management actions locally (separate from Prodentis)
-- Date: 2026-02-05

-- Create table
CREATE TABLE IF NOT EXISTS appointment_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to patient
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    prodentis_id VARCHAR(50) NOT NULL,
    
    -- Appointment identification (from Prodentis API)
    appointment_date TIMESTAMPTZ NOT NULL,
    appointment_end_date TIMESTAMPTZ NOT NULL,
    doctor_id VARCHAR(50),
    doctor_name VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid_reservation',
    -- Possible values:
    --   'unpaid_reservation' - No deposit paid
    --   'deposit_paid' - Deposit paid via Stripe
    --   'attendance_confirmed' - Patient confirmed 24h before
    --   'cancellation_pending' - Patient requested cancellation
    --   'reschedule_pending' - Patient requested reschedule
    
    -- Deposit tracking
    deposit_paid BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(10, 2),
    deposit_payment_intent_id VARCHAR(255), -- Stripe payment intent ID
    deposit_paid_at TIMESTAMPTZ,
    
    -- Attendance confirmation
    attendance_confirmed BOOLEAN DEFAULT FALSE,
    attendance_confirmed_at TIMESTAMPTZ,
    
    -- Cancellation request
    cancellation_requested BOOLEAN DEFAULT FALSE,
    cancellation_requested_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Reschedule request
    reschedule_requested BOOLEAN DEFAULT FALSE,
    reschedule_requested_at TIMESTAMPTZ,
    reschedule_reason TEXT,
    
    -- Admin actions (manual updates from clinic)
    admin_notes TEXT,
    last_updated_by VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_actions_patient 
    ON appointment_actions(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointment_actions_prodentis 
    ON appointment_actions(prodentis_id);

CREATE INDEX IF NOT EXISTS idx_appointment_actions_date 
    ON appointment_actions(appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointment_actions_status 
    ON appointment_actions(status);

CREATE INDEX IF NOT EXISTS idx_appointment_actions_created 
    ON appointment_actions(created_at);

-- Composite unique index to prevent duplicate records
-- One patient can't have multiple action records for the same appointment
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_unique 
    ON appointment_actions(prodentis_id, appointment_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_appointment_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_appointment_actions_updated_at ON appointment_actions;
CREATE TRIGGER trigger_appointment_actions_updated_at
    BEFORE UPDATE ON appointment_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_actions_updated_at();

-- Add helpful comments
COMMENT ON TABLE appointment_actions IS 'Tracks patient appointment management actions (deposits, confirmations, cancellations, reschedules)';
COMMENT ON COLUMN appointment_actions.status IS 'Current appointment status: unpaid_reservation, deposit_paid, attendance_confirmed, cancellation_pending, reschedule_pending';
COMMENT ON COLUMN appointment_actions.deposit_payment_intent_id IS 'Stripe payment intent ID for deposit tracking';
COMMENT ON COLUMN appointment_actions.admin_notes IS 'Internal notes from clinic staff';

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE appointment_actions ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (patients can only see their own records)
-- CREATE POLICY appointment_actions_select_own ON appointment_actions
--     FOR SELECT USING (patient_id = auth.uid());

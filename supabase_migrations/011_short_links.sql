-- Migration 011: Short Links for SMS
-- Purpose: Store shortened URLs for appointment landing pages  
-- Date: 2026-02-07

-- Create short_links table
CREATE TABLE IF NOT EXISTS short_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Short code (e.g. "abc123")
    short_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Full destination URL
    destination_url TEXT NOT NULL,
    
    -- Optional metadata
    appointment_id UUID,
    patient_id UUID,
    appointment_type VARCHAR(100),
    
    -- Analytics
    click_count INTEGER DEFAULT 0,
    last_clicked_at TIMESTAMPTZ,
    
    -- Lifecycle
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast short_code lookups
CREATE INDEX IF NOT EXISTS idx_short_links_code 
    ON short_links(short_code);

-- Index for appointment lookups
CREATE INDEX IF NOT EXISTS idx_short_links_appointment 
    ON short_links(appointment_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_short_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER short_links_updated_at
    BEFORE UPDATE ON short_links
    FOR EACH ROW
    EXECUTE FUNCTION update_short_links_updated_at();

-- Comments
COMMENT ON TABLE short_links IS 'Shortened URLs for SMS appointment reminders';
COMMENT ON COLUMN short_links.short_code IS 'Unique short identifier (e.g. abc123 for /s/abc123)';
COMMENT ON COLUMN short_links.destination_url IS 'Full URL to redirect to';
COMMENT ON COLUMN short_links.expires_at IS 'Optional expiration date for the link';

-- Migration 050: booking_settings table
-- Singleton table for site-wide booking configuration
-- Controlled by admin panel (/api/admin/booking-settings)

CREATE TABLE IF NOT EXISTS booking_settings (
  id INT PRIMARY KEY DEFAULT 1,  -- singleton: only one row ever
  min_days_ahead INT NOT NULL DEFAULT 1,  -- 0=today, 1=tomorrow, 7=next week, etc.
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default row
INSERT INTO booking_settings (id, min_days_ahead)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- RLS: read is public (needed by the booking form), write is service_role only
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_settings_read_public" ON booking_settings
  FOR SELECT USING (true);

CREATE POLICY "booking_settings_write_service" ON booking_settings
  FOR UPDATE USING (auth.role() = 'service_role');

-- Migration 119: doctor_end_methods JSONB w calculated_shifts
-- Dodaje historię metod weryfikacji końca pracy lekarza —
-- pozwala adminowi zobaczyć z czego wynika confidence (closedAt /
-- lastModifiedBy / cross-verify recepcja).

ALTER TABLE calculated_shifts
    ADD COLUMN IF NOT EXISTS doctor_end_methods JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN calculated_shifts.doctor_end_methods IS
    'Array kandydatów na doctor_end_time z różnych metod weryfikacji.
     Format: [{ name, time, confidence, detail? }]
     name: closedAt | lastModifiedByDoctor | receptionCrossVerify | scheduleEnd';

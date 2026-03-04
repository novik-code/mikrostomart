-- ═══════════════════════════════════════════════════════════════════
-- 064: Consent Field Mappings
-- Store consent type definitions & PDF field coordinates in DB
-- instead of hardcoded consentTypes.ts (enables no-code admin editing)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consent_field_mappings (
    consent_key TEXT PRIMARY KEY,                    -- e.g. 'higienizacja', 'rtg'
    label TEXT NOT NULL,                             -- e.g. 'Zgoda na higienizację'
    pdf_file TEXT NOT NULL,                          -- filename in /public/zgody/ or Storage URL
    fields JSONB NOT NULL DEFAULT '{}'::jsonb,       -- field positions (ConsentFieldMap structure)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT                                  -- email of last editor
);

-- Enable RLS
ALTER TABLE consent_field_mappings ENABLE ROW LEVEL SECURITY;

-- Public read access (consent signing page needs it)
CREATE POLICY "Public read" ON consent_field_mappings
    FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access" ON consent_field_mappings
    FOR ALL USING (true) WITH CHECK (true);

-- Seed with existing consent types from code
INSERT INTO consent_field_mappings (consent_key, label, pdf_file, fields) VALUES
(
    'higienizacja',
    'Zgoda na higienizację',
    'zgoda_na_higienizację.pdf',
    '{
        "name": {"x": 208.6, "y": 617.1, "fontSize": 11, "page": 1},
        "pesel": {"startX": 166.4, "y": 576.4, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "date": {"x": 315.6, "y": 119.1, "fontSize": 11, "page": 1},
        "doctor": {"x": 152, "y": 510.3, "fontSize": 11, "page": 1},
        "patient_signature": {"x": 317, "y": 98, "page": 1},
        "doctor_signature": {"x": 99.3, "y": 113.8, "page": 1},
        "address": {"x": 435, "y": 624.3, "fontSize": 11, "page": 1},
        "city": {"x": 434.1, "y": 592.2, "fontSize": 11, "page": 1}
    }'::jsonb
),
(
    'znieczulenie',
    'Zgoda na znieczulenie',
    'zgoda_na_znieczulenie.pdf',
    '{
        "name": {"x": 197.6, "y": 596.5, "fontSize": 11, "page": 1},
        "pesel": {"startX": 168.8, "y": 554.4, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "address": {"x": 413, "y": 612.3, "fontSize": 11, "page": 1},
        "city": {"x": 413.9, "y": 596, "fontSize": 11, "page": 1},
        "patient_signature": {"x": 439.3, "y": 61.6, "page": 1},
        "doctor_signature": {"x": 88.7, "y": 65.4, "page": 1}
    }'::jsonb
),
(
    'chirurgiczne',
    'Zgoda na leczenie chirurgiczne',
    'zgoda_na_leczenie_chirurgiczne.pdf',
    '{
        "name": {"x": 234.1, "y": 637.2, "fontSize": 11, "page": 1},
        "pesel": {"startX": 168.3, "y": 599.9, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "address": {"x": 434.1, "y": 638.2, "fontSize": 11, "page": 1},
        "city": {"x": 435.5, "y": 614.2, "fontSize": 11, "page": 1},
        "tooth": {"x": 178.4, "y": 533.8, "fontSize": 11, "page": 1},
        "doctor": {"x": 119.4, "y": 522.3, "fontSize": 11, "page": 1},
        "doctor_signature": {"x": 127.6, "y": 174.2, "page": 3},
        "date": {"x": 373.6, "y": 183.7, "fontSize": 11, "page": 3},
        "patient_signature": {"x": 374.1, "y": 158.8, "page": 3}
    }'::jsonb
),
(
    'protetyczne',
    'Zgoda na leczenie protetyczne',
    'zgoda_na_leczenie_protetyczne.pdf',
    '{
        "name": {"x": 211.5, "y": 627.6, "fontSize": 11, "page": 1},
        "pesel": {"startX": 150.6, "y": 575, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "address": {"x": 425.4, "y": 633.9, "fontSize": 11, "page": 1},
        "city": {"x": 428.3, "y": 599.9, "fontSize": 11, "page": 1},
        "tooth": {"x": 114.6, "y": 525.2, "fontSize": 11, "page": 1},
        "doctor": {"x": 100.2, "y": 424.6, "fontSize": 11, "page": 1},
        "doctor_signature": {"x": 97.4, "y": 522.3, "page": 3},
        "date": {"x": 351.6, "y": 531.9, "fontSize": 11, "page": 3},
        "patient_signature": {"x": 352.5, "y": 509.4, "page": 3}
    }'::jsonb
),
(
    'endodontyczne',
    'Zgoda na leczenie endodontyczne',
    'zgoda_na_leczenie_endodontyczne.pdf',
    '{
        "name": {"x": 213, "y": 620.5, "fontSize": 11, "page": 1},
        "pesel": {"startX": 163.1, "y": 571.6, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "address": {"x": 429.3, "y": 625.7, "fontSize": 11, "page": 1},
        "city": {"x": 429.3, "y": 589.8, "fontSize": 11, "page": 1},
        "tooth": {"x": 264.3, "y": 502.7, "fontSize": 11, "page": 1},
        "doctor": {"x": 123.3, "y": 489.7, "fontSize": 11, "page": 1},
        "doctor_signature": {"x": 105, "y": 446.6, "page": 3},
        "date": {"x": 330.5, "y": 462.4, "fontSize": 11, "page": 3},
        "patient_signature": {"x": 333.8, "y": 432.7, "page": 3}
    }'::jsonb
),
(
    'zachowawcze',
    'Zgoda na leczenie zachowawcze',
    'zgoda_na_leczenie_zachowawcze.pdf',
    '{
        "name": {"x": 207.7, "y": 597, "fontSize": 11, "page": 1},
        "pesel": {"startX": 147.7, "y": 558.7, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "address": {"x": 419.7, "y": 613.3, "fontSize": 11, "page": 1},
        "city": {"x": 419.7, "y": 600.4, "fontSize": 11, "page": 1},
        "tooth": {"x": 252.3, "y": 501.2, "fontSize": 11, "page": 1},
        "doctor": {"x": 387.1, "y": 501.7, "fontSize": 11, "page": 1},
        "doctor_signature": {"x": 118.9, "y": 156.9, "page": 2},
        "date": {"x": 349.2, "y": 156.4, "fontSize": 11, "page": 2},
        "patient_signature": {"x": 348.7, "y": 127.7, "page": 2}
    }'::jsonb
),
(
    'protetyka_implant',
    'Akceptacja pracy protetycznej na implancie',
    'AKCEPTACJA_PRACY_PROTETYCZNEJ_NA_IMPLANCIE.pdf',
    '{
        "name": {"x": 152.6, "y": 683, "fontSize": 11, "page": 1},
        "pesel": {"startX": 86.8, "y": 660.6, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "address": {"x": 359.2, "y": 684.8, "fontSize": 11, "page": 1},
        "city": {"x": 361.1, "y": 657.3, "fontSize": 11, "page": 1},
        "doctor_signature": {"x": 398.9, "y": 83.9, "page": 1},
        "date": {"x": 79.3, "y": 72.3, "fontSize": 11, "page": 1},
        "patient_signature": {"x": 191.3, "y": 80.2, "page": 1}
    }'::jsonb
),
(
    'rtg',
    'Ankieta i zgoda na RTG',
    'ankieta_i_zgoda_na_rtg.pdf',
    '{
        "name": {"x": 227.3, "y": 591.3, "fontSize": 11, "page": 1},
        "address": {"x": 106, "y": 552.5, "fontSize": 11, "page": 1},
        "city": {"x": 234.1, "y": 572.1, "fontSize": 11, "page": 1},
        "phone": {"x": 275.3, "y": 531.9, "fontSize": 11, "page": 1},
        "pesel": {"startX": 184.7, "y": 496, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "date": {"x": 95.9, "y": 379.6, "fontSize": 11, "page": 2},
        "patient_signature": {"x": 214.9, "y": 379.1, "page": 2}
    }'::jsonb
),
(
    'implantacja',
    'Zgoda na implantację',
    'zgoda_na_implantację.pdf',
    '{
        "city": {"x": 170.3, "y": 588.9, "fontSize": 11, "page": 1},
        "name": {"x": 236.5, "y": 567.3, "fontSize": 11, "page": 1},
        "pesel": {"startX": 70, "y": 534.7, "boxWidth": 23.5, "fontSize": 9, "page": 1},
        "patient_signature": {"x": 324.2, "y": 144.9, "page": 4},
        "date": {"x": 232.6, "y": 145.9, "fontSize": 11, "page": 4}
    }'::jsonb
),
(
    'wizerunek',
    'Zgoda na publikację wizerunku',
    'zgoda_na_publikację_wizerunku.pdf',
    '{
        "name": {"x": 182.3, "y": 602.3, "fontSize": 11, "page": 1},
        "phone": {"x": 116.1, "y": 561.1, "fontSize": 11, "page": 1},
        "city": {"x": 101.7, "y": 122, "fontSize": 11, "page": 1},
        "patient_signature": {"x": 241.7, "y": 124.4, "page": 1},
        "doctor_signature": {"x": 431.2, "y": 123.4, "page": 1}
    }'::jsonb
)
ON CONFLICT (consent_key) DO NOTHING;

COMMENT ON TABLE consent_field_mappings IS 'Stores consent type definitions and PDF field coordinates. Editable via /admin/pdf-mapper without code changes.';

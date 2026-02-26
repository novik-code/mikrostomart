-- Migration 057: Add match_confidence and match_candidates to online_bookings
-- For improved patient matching with double verification

ALTER TABLE online_bookings
  ADD COLUMN IF NOT EXISTS match_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS match_candidates JSONB DEFAULT '[]';

-- Comment for documentation
COMMENT ON COLUMN online_bookings.match_confidence IS 'Patient match score 0-100. NULL = legacy/unscored. >=85 auto-matched, 60-84 needs_review, <60 new patient';
COMMENT ON COLUMN online_bookings.match_candidates IS 'Array of candidate patients found: [{id, firstName, lastName, score, method}]';

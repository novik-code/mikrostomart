-- Google Reviews Cache Table
-- Stores fetched Google reviews persistently so the collection grows over time.
-- Each API fetch upserts new reviews; old reviews are preserved.

CREATE TABLE IF NOT EXISTS google_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    google_author_name TEXT NOT NULL,
    author_photo_url TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    relative_date TEXT,           -- e.g. "2 tygodnie temu"
    publish_time TIMESTAMPTZ,    -- actual publish timestamp
    google_maps_uri TEXT,        -- link to review on Google Maps
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate reviews (same author + same text beginning)
    UNIQUE (google_author_name, review_text)
);

-- Index for fast sorted queries
CREATE INDEX IF NOT EXISTS idx_google_reviews_rating ON google_reviews (rating DESC);
CREATE INDEX IF NOT EXISTS idx_google_reviews_publish ON google_reviews (publish_time DESC);

-- RLS: public read, service role write
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read reviews"
    ON google_reviews FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage reviews"
    ON google_reviews FOR ALL
    USING (true)
    WITH CHECK (true);

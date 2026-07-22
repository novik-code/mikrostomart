-- Migracja 175: cache katalogu filmów kanału YouTube (dla apki mobilnej)
--
-- Kontekst: apka „Strefa wideo" ciągnęła publiczny Atom-RSS kanału, który zwraca
-- TWARDO 15 najnowszych pozycji i nie rozróżnia Shortów od zwykłych filmów —
-- efekt: pokazywała wyłącznie Shorty (15/15), a 143 pełne filmy były niedostępne.
--
-- Rozwiązanie: dobowy sync przez YouTube Data API v3 (klucz już istnieje) do tej
-- tabeli; apka konsumuje jeden stronicowany endpoint /api/youtube/catalog, który
-- czyta WYŁĄCZNIE z Supabase (odporne na kwotę API i awarie).
--
-- Kolejność: wgrać na OBA env PRZED deployem endpointu i crona.

CREATE TABLE IF NOT EXISTS youtube_videos (
    video_id         TEXT PRIMARY KEY,
    title            TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    published_at     TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    is_short         BOOLEAN NOT NULL DEFAULT false,
    thumb_default    TEXT,
    thumb_medium     TEXT,
    thumb_high       TEXT,
    view_count       BIGINT NOT NULL DEFAULT 0,
    -- Ręczne nadpisanie klasyfikacji Short/film (heurystyka duration<=60s bywa
    -- błędna dla nowszych Shortów do 3 min). NULL = klasyfikuj automatycznie.
    is_short_override BOOLEAN,
    synced_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Zakładki „Filmy" / „Shorty", sortowane od najnowszych.
CREATE INDEX IF NOT EXISTS idx_youtube_videos_type_recent
    ON youtube_videos (is_short, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_recent
    ON youtube_videos (published_at DESC);

-- RLS on, BEZ polityk → dostęp wyłącznie service_role (wzorzec z audytu
-- 2026-05-18 / mig 132 / mig 172). Endpoint publiczny czyta service_role-em.
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE youtube_videos IS
    'Cache katalogu kanału YouTube dla apki mobilnej. Zasilane cronem youtube-sync przez Data API v3. Tylko service_role.';

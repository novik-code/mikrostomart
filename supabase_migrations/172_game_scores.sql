-- 172_game_scores.sql
-- Ranking poczekalni dla strefy gier „Mikro-gierki" (apka mobilna).
-- Bez logowania — pseudonim + wynik. Dane NIE-medyczne, osobne od historii leczenia.

CREATE TABLE IF NOT EXISTS game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game VARCHAR(40) NOT NULL,
    nickname VARCHAR(40) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_board ON game_scores (game, score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_recent ON game_scores (game, created_at DESC);

-- RLS WŁĄCZONE, BEZ POLITYK: cały dostęp idzie server-side przez service_role
-- (omija RLS), a anon/authenticated (publiczny anon key) NIE mają bezpośredniego
-- dostępu do tabeli. Zgodne z regułą bezpieczeństwa projektu (mig 132).
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE game_scores IS 'Ranking poczekalni Mikro-gierek — pseudonim + wynik, bez logowania, dane nie-medyczne (apka mobilna). RLS on, dostęp tylko service_role.';

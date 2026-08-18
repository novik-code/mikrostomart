-- Migration 055: Feature Suggestions
-- Allows employees to post feature suggestions/improvements visible to all staff

CREATE TABLE IF NOT EXISTS feature_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_email TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'funkcja', -- 'funkcja' | 'poprawka' | 'pomysł' | 'inny'
    status TEXT NOT NULL DEFAULT 'nowa', -- 'nowa' | 'w_dyskusji' | 'zaplanowana' | 'wdrożona' | 'odrzucona'
    upvotes TEXT[] DEFAULT '{}', -- array of emails that upvoted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments on suggestions
CREATE TABLE IF NOT EXISTS feature_suggestion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES feature_suggestions(id) ON DELETE CASCADE,
    author_email TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 🔴 MINA ROZBROJONA 2026-08-18 — polityki niżej są ZAKOMENTOWANE CELOWO
-- ============================================================================
-- Ten plik tworzył polityki `TO authenticated USING (true)`. W Supabase
-- „authenticated" to KAŻDE konto, nie personel — a to jest tablica wewnętrzna
-- zespołu / kartoteka zadań z nazwiskami pacjentów.
--
-- Na produkcji te polityki JUŻ NIE ISTNIEJĄ: zdjęła je migracja 081
-- (`service_only FOR ALL USING(false)`), a 190 powtórzyła zamiatanie.
-- Zweryfikowane DWOMA niezależnymi miernikami:
--   · 2026-08-12 zachowaniem — pracownik widzi 0 z 25 wierszy, `insert` → 42501
--   · 2026-08-18 odczytem `pg_policies` — pięć tabel, pięć polityk
--     `*_service_only` / `{service_role}`, ZERO `TO authenticated`
--
-- 🔴 PO CO WIĘC TA ZMIANA: migracje w tym projekcie wkleja się RĘCZNIE w konsoli,
-- bez runnera i bez tabeli śledzącej. Nic nie powstrzymywało kogoś przed otwarciem
-- tego pliku i uruchomieniem go „bo tworzy tabelę" — a to OTWIERAŁO tabele
-- z powrotem. Mina nazwana już przez migrację 182 w jej sekcji kontrolnej.
--
-- 🔑 DLACZEGO ZAKOMENTOWANIE JEST BEZPIECZNE, A NIE ODWROTNIE:
-- `ENABLE ROW LEVEL SECURITY` ZOSTAJE. RLS włączone BEZ POLITYK = odmowa dla
-- anon i authenticated, a `service_role` i tak omija RLS. Świeże środowisko jest
-- więc zamknięte od pierwszej sekundy, zamiast być otwarte do czasu migracji 081.
-- Dla środowisk, które ten plik już przeszły, zmiana nie robi NIC.
-- ============================================================================

-- RLS
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_suggestion_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
-- CREATE POLICY "feature_suggestions_select" ON feature_suggestions FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "feature_suggestions_insert" ON feature_suggestions FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "feature_suggestions_update" ON feature_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CREATE POLICY "feature_suggestion_comments_select" ON feature_suggestion_comments FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "feature_suggestion_comments_insert" ON feature_suggestion_comments FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_feature_suggestions_created ON feature_suggestions(created_at DESC);
CREATE INDEX idx_feature_suggestion_comments_suggestion ON feature_suggestion_comments(suggestion_id, created_at);

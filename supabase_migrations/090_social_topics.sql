-- Migration 090: Social Topics — DB-backed topic management for AI social posts
-- Replaces hardcoded DENTAL_TOPICS array in socialAI.ts

CREATE TABLE IF NOT EXISTS social_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    category TEXT DEFAULT 'general',  -- e.g. 'implantologia', 'higiena', 'estetyka', 'ogólne'
    is_active BOOLEAN DEFAULT true,
    used_count INTEGER DEFAULT 0,     -- how many times this topic was used for AI generation
    last_used_at TIMESTAMPTZ,
    created_by TEXT,                   -- 'admin' | 'ai' | 'seed'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_topics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_topics' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_topics USING (false);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_topics_active ON social_topics(is_active);

-- Seed with the original 25 dental topics
INSERT INTO social_topics (topic, category, created_by) VALUES
    ('Korzyści z regularnych przeglądów stomatologicznych', 'ogólne', 'seed'),
    ('Jak prawidłowo szczotkować zęby — najczęstsze błędy', 'higiena', 'seed'),
    ('Implant vs most — co wybrać?', 'implantologia', 'seed'),
    ('Wybielanie zębów — metody i fakty', 'estetyka', 'seed'),
    ('Leczenie kanałowe pod mikroskopem — bez bólu', 'endodoncja', 'seed'),
    ('Laserowe leczenie dziąseł — rewolucja w periodontologii', 'laser', 'seed'),
    ('Bruksizm — skrzytanie zębami i jak z nim walczyć', 'ogólne', 'seed'),
    ('Pierwsza wizyta u dentysty z dzieckiem — poradnik dla rodziców', 'dzieci', 'seed'),
    ('Czym jest stomatologia estetyczna?', 'estetyka', 'seed'),
    ('Korony porcelanowe — kiedy warto?', 'protetyka', 'seed'),
    ('Nakładki ortodontyczne — niewidoczna korekta uśmiechu', 'ortodoncja', 'seed'),
    ('Jak dbać o zęby w ciąży?', 'ogólne', 'seed'),
    ('Fluoryzacja — czy jest bezpieczna?', 'higiena', 'seed'),
    ('Zdrowa dieta a zdrowe zęby — co jeść?', 'ogólne', 'seed'),
    ('Nadwrażliwość zębów — przyczyny i rozwiązania', 'ogólne', 'seed'),
    ('Technologia 3D w stomatologii', 'ogólne', 'seed'),
    ('Białe plamy na zębach — co oznaczają?', 'ogólne', 'seed'),
    ('Próchnica wczesna u dzieci — zapobieganie', 'dzieci', 'seed'),
    ('Protezy na implantach — komfort jak z własnymi zębami', 'implantologia', 'seed'),
    ('Skaling i piaskowanie — dlaczego regularna higiena jest ważna', 'higiena', 'seed'),
    ('Uśmiech a pewność siebie — jak stomatologia zmienia życie', 'estetyka', 'seed'),
    ('Zęby mądrości — usuwać czy nie?', 'chirurgia', 'seed'),
    ('Stomatologia mikroskopowa — precyzja na najwyższym poziomie', 'ogólne', 'seed'),
    ('Resorpcja korzeni — ukryty problem', 'endodoncja', 'seed'),
    ('Chirurgia stomatologiczna — kiedy jest konieczna?', 'chirurgia', 'seed');

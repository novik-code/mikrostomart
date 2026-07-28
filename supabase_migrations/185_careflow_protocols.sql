-- Migracja 185: protokoły CareFlow — jeden schemat, cztery warianty
--
-- Zastępuje sześć odrębnych szkiców z `PROTOKOLY_CAREFLOW_DO_AKCEPTACJI_2026-07-26.md`.
-- Decyzja lekarza (2026-07-28): schemat jest JEDEN, różni się WYŁĄCZNIE długością.
--
-- ─── SIATKA DAWKOWANIA 07:00 / 15:00 / 23:00 ─────────────────────────────────
-- Wszystkie dawki podtrzymujące siedzą na stałej siatce, żeby pacjent miał trzy
-- ludzkie pory na dobę zamiast dryfu „co 8 h od godziny zabiegu" (zabieg o 11:40
-- dawałby dawki o 19:40, 03:40, 11:40…). Odstęp siatki to dokładnie 8 h, więc krok
-- „co 8 h" zakotwiczony na slocie zostaje na niej sam.
--
-- Dopasowanie robi `dose_snap` (kolumna dodana niżej), obsługiwane przez
-- `src/lib/careflowSchedule.ts`. Trzy tryby, przypięte 13 testami:
--   loading — slot w chwili `zabieg − 8 h` LUB WCZEŚNIEJ
--   pre_op  — ostatni slot przed zabiegiem; przy kolizji z nasycającą godzina przed
--   grid    — pierwszy slot ŚCIŚLE PO nominalnym terminie (odstęp wolno SKRÓCIĆ)
--
-- Sprawdzone wobec przykładów lekarza, co do godziny:
--   zabieg 09:00 → 2 g 23:00 (dzień wcześniej) | 1 g 07:00 | pierwsza po: 15:00
--   zabieg 15:00 → 2 g 07:00                   | 1 g 14:00 | pierwsza po: 23:00
--
-- ─── CO WCHODZI ──────────────────────────────────────────────────────────────
-- 1. Kolumna `dose_snap` na `care_template_steps`.
-- 2. Wyłączenie starego seeda „Zabieg chirurgiczny" (bloker B1) — MUSI być pierwsze.
-- 3. Cztery protokoły: 4, 7 i 10 dni (amoksycylina) + wariant dla alergii na penicyliny.
--
-- ⚠️ WARIANT ALERGICZNY = KLINDAMYCYNA 600 mg → 300 mg co 8 h, MAKSYMALNIE 3 DOBY.
--    Limit jest farmakologiczny (ryzyko C. difficile), nie zależy od rozległości zabiegu —
--    dlatego jeden wariant, a nie trzy długości. Opis KAŻDEJ dawki niesie ostrzeżenie
--    o biegunce. Klindamycyna NIE nadaje się do profilaktyki infekcyjnego zapalenia
--    wsierdzia — AHA 2021 i ESC 2023 wycofały ją z tego wskazania; ten protokół jest
--    osłoną okołozabiegową, nie profilaktyką IZW.

BEGIN;

-- ─── 1. Kolumna dopasowania do siatki ────────────────────────────────────────
ALTER TABLE care_template_steps
    ADD COLUMN IF NOT EXISTS dose_snap TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'care_step_dose_snap_check'
    ) THEN
        ALTER TABLE care_template_steps
            ADD CONSTRAINT care_step_dose_snap_check
            CHECK (dose_snap IS NULL OR dose_snap IN ('loading', 'pre_op', 'grid'));
    END IF;
END $$;

COMMENT ON COLUMN care_template_steps.dose_snap IS
    'Dopasowanie terminu do siatki dawkowania 07/15/23 (loading | pre_op | grid). '
    'NULL = termin wprost z offset_hours. Ma PIERWSZEŃSTWO przed smart_snap: termin '
    'z siatki jest kliniczny, a strażnik ciszy zepchnąłby dawkę 23:00 na 22:00.';

-- ─── 2. BLOKER B1: stary seed musi zgasnąć PRZED wstawieniem nowych ──────────
-- `procedure_types = {Chirurgia, Implantologia}` i `is_active = true` sprawiają, że
-- auto-kwalifikacja dalej łapie każdą „Chirurgię" starym protokołem. Gdyby personel
-- uruchomił obok nowy, pacjent dostałby DWIE antybiotykoterapie.
UPDATE care_templates
   SET is_active = false,
       updated_at = NOW()
 WHERE name = 'Zabieg chirurgiczny';

-- ─── 3. Cztery protokoły ─────────────────────────────────────────────────────
DO $$
DECLARE
    v_variant   RECORD;
    v_template  UUID;
    v_meds      JSONB;
    v_doses     INT;
BEGIN
    FOR v_variant IN
        SELECT * FROM (VALUES
            -- (dni, nazwa, wskazania, czy metronidazol)
            (4,  'Opieka pozabiegowa — 4 dni',  'Ekstrakcje zębów zatrzymanych, proste implantacje', false),
            (7,  'Opieka pozabiegowa — 7 dni',  'Przeszczepy, prostsze augmentacje',                  false),
            (10, 'Opieka pozabiegowa — 10 dni', 'Duże augmentacje, podniesienie zatoki',              true),
            -- Alergia na penicyliny: klindamycyna, MAKSYMALNIE 3 doby (ryzyko C. difficile).
            -- Dlatego jeden wariant, a nie trzy długości — limit jest farmakologiczny,
            -- nie zależy od rozległości zabiegu.
            (3,  'Opieka pozabiegowa — alergia na penicyliny', 'Alergia na penicyliny; osłona 3 doby', false)
        ) AS t(days, tpl_name, indications, with_metro)
    LOOP
        -- 3 dawki na dobę (siatka 07/15/23) przez `days` dób.
        v_doses := v_variant.days * 3;

        -- Leki. Dawka nasycająca i podtrzymująca to DWIE ODRĘBNE pozycje: pole `dose`
        -- kopiuje się dosłownie do każdej dawki, więc jedna pozycja sprawiłaby, że przy
        -- dawce 6/12 pacjent czytałby „2 g jednorazowo przed zabiegiem".
        -- Wariant alergiczny: klindamycyna zamiast amoksycyliny.
        -- ⚠️ Klindamycyna NIE nadaje się do profilaktyki infekcyjnego zapalenia wsierdzia
        -- (AHA 2021 / ESC 2023 ją z tego wskazania wycofały) i wymaga jawnego ostrzeżenia
        -- o C. difficile przy KAŻDEJ dawce — stąd limit 3 dób.
        v_meds := CASE WHEN v_variant.tpl_name LIKE '%alergia%' THEN
            jsonb_build_array(
                jsonb_build_object(
                    'name', 'Klindamycyna',
                    'dose', '600 mg jednorazowo',
                    'description', 'Dawka nasycająca przed zabiegiem (alergia na penicyliny). Przy biegunce w trakcie lub po kuracji odstaw lek i natychmiast skontaktuj się z nami.',
                    'frequency', 'jednorazowo'),
                jsonb_build_object(
                    'name', 'Klindamycyna',
                    'dose', '300 mg',
                    'description', 'Osłona antybiotykowa (alergia na penicyliny). Przy biegunce w trakcie lub po kuracji odstaw lek i natychmiast skontaktuj się z nami.',
                    'frequency', 'co 8 godzin')
            )
        ELSE
            jsonb_build_array(
                jsonb_build_object(
                    'name', 'Amoksycylina',
                    'dose', '2 g jednorazowo',
                    'description', 'Dawka nasycająca przed zabiegiem.',
                    'frequency', 'jednorazowo'),
                jsonb_build_object(
                    'name', 'Amoksycylina',
                    'dose', '1 g',
                    'description', 'Osłona antybiotykowa.',
                    'frequency', 'co 8 godzin')
            )
        END || jsonb_build_array(
            jsonb_build_object(
                'name', 'Nimesulid',
                'dose', '100 mg',
                'description', 'Lek przeciwbólowy i przeciwzapalny. Maksymalnie 2 dawki na dobę.',
                'frequency', 'do 2 razy na dobę'),
            jsonb_build_object(
                'name', 'Paracetamol',
                'dose', '1 g',
                'description', 'Lek przeciwbólowy. Maksymalnie 3 g na dobę.',
                'frequency', 'co 8 godzin')
        );

        IF v_variant.with_metro THEN
            v_meds := v_meds || jsonb_build_array(
                jsonb_build_object(
                    'name', 'Metronidazol',
                    'dose', '500 mg',
                    'description', 'Uzupełnienie osłony antybiotykowej.',
                    'frequency', 'co 8 godzin')
            );
        END IF;

        INSERT INTO care_templates (name, description, procedure_types, is_active, default_medications, push_settings)
        VALUES (
            v_variant.tpl_name,
            v_variant.indications || '. Dawki na stałej siatce 07:00 / 15:00 / 23:00.',
            -- 🔑 PUSTE: żaden protokół nie uruchamia się automatycznie. Auto-kwalifikacja
            -- porównuje się z `appointmentType.name` z API Prodentisa, a nie z mapą kolorów
            -- grafiku — dopóki nie mamy zrzutu realnych nazw, dopasowanie byłoby zgadywaniem.
            '{}',
            true,
            v_meds,
            -- quiet_hours_start 24 = nie wyciszamy wieczorem: dawka 23:00 MUSI dostać
            -- przypomnienie (pacjent bierze ją świadomie przed snem).
            '{"reminder_interval_minutes": 30, "reminder_max_count": 6, "quiet_hours_start": 24, "quiet_hours_end": 7}'::jsonb
        )
        RETURNING id INTO v_template;

        -- ── Antybiotyk ──────────────────────────────────────────────────────
        INSERT INTO care_template_steps
            (template_id, sort_order, title, description, icon, offset_hours, dose_snap, smart_snap,
             is_recurring, recurrence_count, recurrence_interval_hours, medication_index,
             requires_confirmation, push_message)
        VALUES
            (v_template, 1, 'Dawka osłonowa przed zabiegiem',
             'Weź lek osłonowy zgodnie z opisem w karcie leku poniżej. To najważniejszy element ochrony przed zakażeniem.',
             '💊', -8, 'loading', false, false, 0, 0, 0, true,
             'Pora na lek przed zabiegiem'),

            (v_template, 2, 'Druga dawka przed zabiegiem',
             'Weź kolejną dawkę leku osłonowego przed przyjazdem do gabinetu.',
             '💊', -1, 'pre_op', false, false, 0, 0, 1, true,
             'Pora na lek przed zabiegiem'),

            (v_template, 3, 'Osłona antybiotykowa',
             'Weź kolejną dawkę leku osłonowego. Nie odklikuj dawki, której nie wziąłeś — gabinet opiera się na tej informacji.',
             '💊', 0, 'grid', false, true, v_doses, 8, 1, true,
             'Pora na lek');

        -- ── Metronidazol (tylko wariant 10-dniowy) ──────────────────────────
        IF v_variant.with_metro THEN
            INSERT INTO care_template_steps
                (template_id, sort_order, title, description, icon, offset_hours, dose_snap, smart_snap,
                 is_recurring, recurrence_count, recurrence_interval_hours, medication_index,
                 requires_confirmation, push_message)
            VALUES
                (v_template, 4, 'Drugi lek osłonowy',
                 'Weź drugi lek osłonowy razem z pierwszym. Szczegóły w karcie leku poniżej.',
                 '💊', 0, 'grid', false, true, v_doses, 8, 4, true,
                 'Pora na lek');
        END IF;

        -- ── Przeciwbólowo: pierwsza doba ────────────────────────────────────
        -- Nimesulid trzyma się zabiegu i slotu wieczornego (pułap 2 dawki/dobę),
        -- paracetamol wypełnia sloty pośrednie. Od drugiej doby: w razie bólu,
        -- BEZ zaplanowanych zadań — dlatego nie ma tu rekurencji.
        INSERT INTO care_template_steps
            (template_id, sort_order, title, description, icon, offset_hours, dose_snap, smart_snap,
             is_recurring, recurrence_count, recurrence_interval_hours, medication_index,
             requires_confirmation, push_message)
        VALUES
            (v_template, 10, 'Lek przeciwbólowy przed zabiegiem',
             'Weź lek przeciwbólowy tuż przed zabiegiem — zadziała, zanim ustąpi znieczulenie.',
             '💊', -0.25, NULL, false, false, 0, 0, 2, true,
             'Pora na lek przeciwbólowy'),

            (v_template, 11, 'Lek przeciwbólowy po zabiegu',
             'Weź lek przeciwbólowy. Jeśli ból nie ustępuje, zadzwoń do nas — numer masz w aplikacji.',
             '💊', 0, 'grid', false, true, 2, 16, 3, true,
             'Pora na lek przeciwbólowy'),

            (v_template, 12, 'Lek przeciwbólowy wieczorem',
             'Weź drugą dawkę leku przeciwbólowego. To ostatnia zaplanowana dawka tego leku w dobie.',
             '💊', 8, 'grid', false, false, 0, 0, 2, true,
             'Pora na lek przeciwbólowy'),

            (v_template, 13, 'Od drugiej doby — w razie bólu',
             'Od jutra leki przeciwbólowe bierz tylko wtedy, gdy odczuwasz ból. Nie przekraczaj dawek podanych w kartach leków. Jeśli ból narasta zamiast ustępować, napisz do nas na czacie lub wyślij SMS.',
             'ℹ️', 24, 'grid', false, false, 0, 0, NULL, true,
             NULL);

        -- ── Zalecenia niefarmakologiczne ────────────────────────────────────
        INSERT INTO care_template_steps
            (template_id, sort_order, title, description, icon, offset_hours, dose_snap, smart_snap,
             is_recurring, recurrence_count, recurrence_interval_hours, medication_index,
             requires_confirmation, push_message)
        VALUES
            (v_template, 20, 'Zimny okład',
             'Przykładaj zimny okład do policzka po stronie zabiegu — 15 minut z przerwami. Zmniejsza obrzęk w pierwszej dobie.',
             '🧊', 1, NULL, true, true, 4, 3, NULL, true,
             'Pora na zimny okład'),

            (v_template, 21, 'Nie płucz i nie pluj',
             'Przez pierwszą dobę nie płucz ust i nie spluwaj — chronisz skrzep, od którego zależy gojenie. Nie pij przez słomkę i nie pal.',
             '🩹', 2, NULL, true, false, 0, 0, NULL, true,
             NULL),

            (v_template, 22, 'Zakaz palenia — 72 godziny',
             'Nie pal przez 72 godziny od zabiegu. Dym zaburza gojenie i zwiększa ryzyko powikłań.',
             '🚭', 3, NULL, true, false, 0, 0, NULL, true,
             NULL),

            (v_template, 23, 'Płukanka z chlorheksydyną',
             'Zacznij płukać jamę ustną płynem z chlorheksydyną 0,2%: 10 ml przez minutę, dwa razy dziennie. Nie wcześniej niż dobę po zabiegu.',
             '🪥', 24, 'grid', false, true, 10, 12, NULL, true,
             'Pora na płukankę'),

            (v_template, 24, 'Kontrola gojenia',
             'Umów się na kontrolę, jeśli nie masz jeszcze wyznaczonego terminu. Jeśli pojawi się narastający ból, gorączka lub obrzęk — skontaktuj się z nami wcześniej.',
             '🩺', 168, NULL, true, false, 0, 0, NULL, true,
             'Czas na kontrolę');
    END LOOP;
END $$;

COMMIT;

-- ─── KONTROLA PO WGRANIU ─────────────────────────────────────────────────────
-- Powinny wyjść CZTERY protokoły i zero aktywnych starych seedów:
--   SELECT name, is_active, jsonb_array_length(default_medications) AS leki
--     FROM care_templates ORDER BY name;
--
-- Liczba zadań lekowych na pacjenta (POTWIERDZONE na wgranej bazie):
--   4 dni   → 12 osłony + 2 okołozabiegowe + 4 przeciwbólowe = 18
--   7 dni   → 21 + 2 + 4 = 27
--   10 dni  → 30 + 30 metronidazolu + 2 + 4 = 66
--   alergia → 9 + 2 + 4 = 15
-- (wcześniejsza wersja tego komentarza liczyła sam antybiotyk i zaniżała o 4)
--
-- ⚠️ Wariant 10-dniowy to 66 zadań lekowych. Lekarz o tym wie i zaakceptował
--    schemat; sposób ograniczenia (np. łączenie obu leków w jedno zadanie) jest
--    otwartym tematem, celowo NIE rozstrzygniętym w tej migracji.

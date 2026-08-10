-- Migracja 189: protokoły CareFlow uruchamiane PO ZABIEGU (dwa warianty)
--
-- Uzupełnienie migracji 185. Tamte protokoły zakładają, że pacjent ma lek PRZED zabiegiem
-- (dawka nasycająca 8 h wcześniej). Te dwa startują dopiero po zabiegu:
--
--   A. „…(recepta po zabiegu)” — pacjent dostaje kod recepty, musi wykupić antybiotyk.
--      Krok „wykup” przypomina CO GODZINĘ, aż pacjent go odhaczy.
--   B. „…(pacjent ma antybiotyk)” — bez kroku wykupu, lek już jest w domu.
--
-- ─── DOBA 1 JEST WYJĄTKIEM, DOBY 2–4 BEZ ZMIAN ───────────────────────────────
-- Decyzja lekarza (2026-08-03):
--   • pierwsza dawka to UDERZENIOWA 2 g, brana realnie ~2 h po zabiegu (wariant A:
--     pacjent musi zdążyć wykupić lek; nawet przy zabiegu o 9:00 kończącym się o 10:00
--     realny najwcześniejszy czas to ~11:00),
--   • druga i ostatnia dawka doby 1 wypada na wieczornym slocie siatki — 23:00,
--     więc odstęp między pierwszą a drugą bywa KRÓTSZY niż 8 h (to jest zamierzone),
--   • doby 2–4: normalna siatka 07:00 / 15:00 / 23:00, dawka podtrzymująca 1 g.
--
-- 🔑 DLACZEGO TO NIE WYMAGA ZMIAN W SILNIKU
-- 23:00 leży na istniejącej siatce, więc wystarczy `dose_snap = 'grid'`, który bierze
-- „pierwszy slot ŚCIŚLE PO nominalnym terminie”. Offset +7 h od zabiegu daje 23:00 dla
-- każdego zabiegu z przedziału 08:00–15:59 (najczęstszy zakres pracy gabinetu):
--     zabieg 08:00 → nominal 15:00 → pierwszy slot ściśle po → 23:00
--     zabieg 11:00 → nominal 18:00 →                          → 23:00
--     zabieg 15:00 → nominal 22:00 →                          → 23:00
-- ⚠️ Zabieg o 16:00 lub później: nominal ≥ 23:00, więc pierwsza dawka podtrzymująca
--    przesunie się na 07:00 następnej doby, a doba 1 skończy się na samej uderzeniowej.
--    To poprawne klinicznie (odstęp nigdy się nie SKRACA poniżej normy), ale odnotowane.
--
-- ─── PUSH O WYKUPIENIU ───────────────────────────────────────────────────────
-- `reminder_interval_minutes = 60`, `reminder_max_count = 99` — praktycznie bez limitu.
-- Cron przestaje sam, gdy pacjent odhaczy zadanie. Cisza nocna (00:00–07:00) i tak
-- przerwie ponawianie i wznowi rano — to zachowanie zamierzone, nie usterka.
-- Krok NIE MA `medication_index`, więc nie jest dawką leku i nie obowiązuje go
-- okno potwierdzenia 1 h (`409 window_closed`) — pacjent może odhaczyć wykup później.
--
-- ─── CZEGO TA MIGRACJA NIE RUSZA ─────────────────────────────────────────────
-- Nie zmienia protokołów z migracji 185, nie zmienia siatki, nie zmienia kolumn.
-- `procedure_types = '{}'` → żaden z nowych protokołów NIE uruchamia się automatycznie;
-- przypisuje je wyłącznie lekarz, a auto-kwalifikacja ich nie dotknie.

BEGIN;

DO $$
DECLARE
    v_variant   RECORD;
    v_template  UUID;
    v_meds      JSONB;
BEGIN
    FOR v_variant IN
        SELECT * FROM (VALUES
            -- (nazwa, wskazania, czy krok wykupu recepty)
            ('Opieka pozabiegowa — 4 dni (recepta po zabiegu)',
             'Antybiotyk przepisywany po zabiegu — pacjent wykupuje lek w aptece', true),
            ('Opieka pozabiegowa — 4 dni (pacjent ma antybiotyk)',
             'Antybiotyk już w posiadaniu pacjenta — start bez wizyty w aptece',   false)
        ) AS t(tpl_name, indications, with_pickup)
    LOOP
        -- 🔑 IDEMPOTENCJA. Migrację wgrywa się na DWA środowiska, a pomyłkowe powtórzenie
        -- utworzyłoby drugi komplet protokołów o tych samych nazwach (INSERT bez ON CONFLICT).
        -- Protokołów NIE kasujemy i nie nadpisujemy: `care_enrollments.template_id` może już
        -- na nie wskazywać, a usunięcie szablonu zerwałoby historię leczenia pacjenta.
        -- Ewentualne poprawki treści idą osobnym UPDATE-em na końcu pliku.
        CONTINUE WHEN EXISTS (
            SELECT 1 FROM care_templates WHERE name = v_variant.tpl_name
        );

        -- Leki. Dawka nasycająca i podtrzymująca to DWIE ODRĘBNE pozycje, bo pole `dose`
        -- kopiuje się dosłownie do każdej dawki (inaczej przy dawce 6/11 pacjent czytałby
        -- „2 g jednorazowo”). Zestaw identyczny jak w protokole 4-dniowym z migracji 185.
        v_meds := jsonb_build_array(
            jsonb_build_object(
                'name', 'Amoksycylina',
                'dose', '2 g jednorazowo',
                'description', 'Dawka uderzeniowa — pierwsza dawka po zabiegu.',
                'frequency', 'jednorazowo'),
            jsonb_build_object(
                'name', 'Amoksycylina',
                'dose', '1 g',
                'description', 'Osłona antybiotykowa.',
                'frequency', 'co 8 godzin'),
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

        INSERT INTO care_templates (name, description, procedure_types, is_active, default_medications, push_settings)
        VALUES (
            v_variant.tpl_name,
            v_variant.indications || '. Pierwsza dawka uderzeniowa po zabiegu, dalej siatka 07:00 / 15:00 / 23:00.',
            '{}',
            true,
            v_meds,
            -- quiet_hours_start 24 = nie wyciszamy wieczorem: dawka 23:00 MUSI dostać
            -- przypomnienie (pacjent bierze ją świadomie przed snem).
            '{"reminder_interval_minutes": 30, "reminder_max_count": 6, "quiet_hours_start": 24, "quiet_hours_end": 7}'::jsonb
        )
        RETURNING id INTO v_template;

        -- ── Wykup recepty (tylko wariant A) ─────────────────────────────────
        -- offset +1 h: pacjent zwykle jest jeszcze w gabinecie albo właśnie wychodzi.
        -- `dose_snap = NULL` → termin wprost z offsetu; `smart_snap` przesunie go z ciszy nocnej.
        IF v_variant.with_pickup THEN
            INSERT INTO care_template_steps
                (template_id, sort_order, title, description, icon, offset_hours, dose_snap, smart_snap,
                 is_recurring, recurrence_count, recurrence_interval_hours, medication_index,
                 requires_confirmation, push_message, reminder_interval_minutes, reminder_max_count)
            VALUES
                (v_template, 0, 'Wykup antybiotyk w aptece',
                 'Kod recepty znajdziesz na karcie planu opieki, nad listą zadań. '
                 || 'Wykup lek jak najszybciej: pierwsza dawka jest najważniejszym elementem ochrony przed zakażeniem. '
                 || 'Odhacz to zadanie, gdy będziesz mieć lek — dopiero wtedy przestaniemy przypominać.',
                 '🏥', 1, NULL, true, false, 0, 0, NULL, true,
                 'Wykup antybiotyk — przypomnimy, aż odhaczysz', 60, 99);
        END IF;

        -- ── Antybiotyk ──────────────────────────────────────────────────────
        -- Dawka uderzeniowa: +2 h od zabiegu, BEZ siatki (pacjent bierze ją, gdy tylko ma lek).
        -- Podtrzymujące: offset +7 h + `grid` → pierwszy slot to 23:00 doby 1 (patrz nagłówek),
        -- potem co 8 h przez doby 2–4. 10 dawek = 23:00 + (07/15/23 × 3 doby).
        INSERT INTO care_template_steps
            (template_id, sort_order, title, description, icon, offset_hours, dose_snap, smart_snap,
             is_recurring, recurrence_count, recurrence_interval_hours, medication_index,
             requires_confirmation, push_message)
        VALUES
            (v_template, 1, 'Pierwsza dawka — uderzeniowa',
             'Weź pierwszą dawkę leku osłonowego zgodnie z opisem w karcie leku poniżej. '
             || 'To dawka uderzeniowa — najważniejszy element ochrony przed zakażeniem.',
             '💊', 2, NULL, true, false, 0, 0, 0, true,
             'Pora na pierwszą dawkę leku osłonowego'),

            (v_template, 2, 'Osłona antybiotykowa',
             'Weź kolejną dawkę leku osłonowego. Nie odklikuj dawki, której nie wziąłeś — gabinet opiera się na tej informacji.',
             '💊', 7, 'grid', false, true, 10, 8, 1, true,
             'Pora na lek');

        -- ── Przeciwbólowo: pierwsza doba ────────────────────────────────────
        -- W protokołach z migracji 185 pierwszy nimesulid szedł TUŻ PRZED zabiegiem,
        -- żeby zadziałał, zanim ustąpi znieczulenie. Tutaj tej fazy nie ma, więc
        -- nimesulid wchodzi zaraz po zabiegu. Reszta rytmu bez zmian: paracetamol
        -- w slotach pośrednich, nimesulid wieczorem (pułap 2 dawki/dobę),
        -- od drugiej doby w razie bólu, BEZ zaplanowanych zadań.
        INSERT INTO care_template_steps
            (template_id, sort_order, title, description, icon, offset_hours, dose_snap, smart_snap,
             is_recurring, recurrence_count, recurrence_interval_hours, medication_index,
             requires_confirmation, push_message)
        VALUES
            (v_template, 10, 'Lek przeciwbólowy po zabiegu',
             'Weź lek przeciwbólowy zaraz po zabiegu — zadziała, zanim ustąpi znieczulenie.',
             '💊', 0.25, NULL, false, false, 0, 0, 2, true,
             'Pora na lek przeciwbólowy'),

            (v_template, 11, 'Lek przeciwbólowy — kolejna dawka',
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

        -- ── Zalecenia niefarmakologiczne (identyczne jak w migracji 185) ────
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

-- ─── Poprawki treści dla instalacji, które wgrały wcześniejszą wersję pliku ──
-- Idempotentne i bezpieczne przy pierwszym wgraniu (0 wierszy do poprawienia).
-- Wcześniejsza wersja kierowała pacjenta po kod recepty do „wiadomości od gabinetu";
-- kod jest realnie w aplikacji, na karcie planu (`PrescriptionCard` w `opieka.tsx`).
UPDATE care_template_steps
SET description =
        'Kod recepty znajdziesz na karcie planu opieki, nad listą zadań. '
     || 'Wykup lek jak najszybciej: pierwsza dawka jest najważniejszym elementem ochrony przed zakażeniem. '
     || 'Odhacz to zadanie, gdy będziesz mieć lek — dopiero wtedy przestaniemy przypominać.'
WHERE title = 'Wykup antybiotyk w aptece'
  AND description LIKE '%wiadomości od gabinetu%';

COMMIT;

-- ─── KONTROLA PO WGRANIU ─────────────────────────────────────────────────────
-- 0) NAJPIERW: czy nie ma duplikatów (każda nazwa dokładnie raz):
--
--    SELECT name, COUNT(*) AS ile
--    FROM care_templates
--    WHERE name LIKE 'Opieka pozabiegowa — 4 dni (%'
--    GROUP BY name ORDER BY name;
--    -- oczekiwane: 2 wiersze, ile = 1 przy każdym. Jeśli ile = 2 → migracja poszła
--    -- dwa razy PRZED dodaniem zabezpieczenia; patrz „SPRZĄTANIE DUPLIKATÓW" niżej.
--
-- 1) Dwa nowe protokoły, oba aktywne, oba bez auto-kwalifikacji:
--
--    SELECT name, is_active, procedure_types,
--           jsonb_array_length(default_medications) AS leki
--    FROM care_templates
--    WHERE name LIKE 'Opieka pozabiegowa — 4 dni (%'
--    ORDER BY name;
--    -- oczekiwane: 2 wiersze, is_active = true, procedure_types = {}, leki = 4
--
-- 2) Liczba kroków: wariant z receptą 12, bez recepty 11 (różnica = krok wykupu).
--    Kroków lekowych (medication_index NOT NULL) w obu wariantach: 5.
--
--    SELECT t.name, COUNT(s.id) AS kroki,
--           COUNT(*) FILTER (WHERE s.medication_index IS NOT NULL) AS kroki_lekowe
--    FROM care_templates t
--    JOIN care_template_steps s ON s.template_id = t.id
--    WHERE t.name LIKE 'Opieka pozabiegowa — 4 dni (%'
--    GROUP BY t.name ORDER BY t.name;
--
-- 3) Krok wykupu ma ponawianie co 60 min i NIE jest dawką leku:
--
--    SELECT t.name, s.title, s.reminder_interval_minutes, s.reminder_max_count,
--           s.medication_index, s.offset_hours
--    FROM care_template_steps s
--    JOIN care_templates t ON t.id = s.template_id
--    WHERE s.title = 'Wykup antybiotyk w aptece';
--    -- oczekiwane: 1 wiersz, 60 / 99 / medication_index NULL / offset 1
--
-- 4) KONTROLA NEGATYWNA — protokoły z migracji 185 nietknięte:
--
--    SELECT name, is_active FROM care_templates
--    WHERE name LIKE 'Opieka pozabiegowa — %' AND name NOT LIKE '%(%'
--    ORDER BY name;
--    -- oczekiwane: 4 wiersze (4/7/10 dni + alergia), wszystkie is_active = true

-- ─── SPRZĄTANIE DUPLIKATÓW (uruchamiać TYLKO jeśli kontrola 0 pokazała ile = 2) ─
-- Kasuje MŁODSZĄ kopię każdego protokołu, ale wyłącznie taką, do której NIE jest
-- przypisany żaden pacjent. Kroki znikną same (ON DELETE CASCADE na template_id).
--
--    WITH dupy AS (
--        SELECT id, name,
--               ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) AS nr
--        FROM care_templates
--        WHERE name LIKE 'Opieka pozabiegowa — 4 dni (%'
--    )
--    DELETE FROM care_templates t
--    USING dupy d
--    WHERE t.id = d.id
--      AND d.nr > 1
--      AND NOT EXISTS (SELECT 1 FROM care_enrollments e WHERE e.template_id = t.id);
--
-- Po sprzątaniu powtórzyć kontrolę 0 — musi wyjść po jednym wierszu na nazwę.

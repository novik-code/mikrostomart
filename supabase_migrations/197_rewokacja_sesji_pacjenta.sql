-- ============================================================================
-- Migracja 197 — REWOKACJA SESJI PACJENTA (takt 1 z 3: sama kolumna)
-- Data: 2026-08-13
-- Wejście: audyt bezpieczeństwa, sesja 2 · plan napraw, pozycja „rewokacja sesji"
--
-- ============================================================================
-- PROBLEM
-- ============================================================================
-- Token pacjenta żyje **30 dni** w aplikacji i 7 dni w przeglądarce
-- (`patients/login/route.ts:382`), a unieważnić go dziś **NIE DA SIĘ NICZYM**.
-- Zmierzone: 31 tras weryfikuje token, zero mechanizmu rewokacji.
--
-- Skutki, wszystkie realne:
--   • pacjent zmienia hasło, bo podejrzewa wyciek → stary token działa 30 dni
--   • kradzież telefonu → dostęp do kartoteki przez 30 dni
--   • usunięcie konta (RODO) → token nadal otwiera dane
--   • oddany/sprzedany telefon bez wylogowania → następny właściciel wchodzi
-- Zmiana hasła NIE WYRZUCA nikogo. To jedyna obrona, jaką pacjent ma, i nie działa.
--
-- ============================================================================
-- MECHANIZM
-- ============================================================================
-- Token niesie `iat` (data wystawienia) — sprawdzone, `jwt.sign` dodaje je domyślnie.
-- Kolumna `sessions_valid_from` mówi: „tokeny starsze niż to są nieważne".
-- Zmiana hasła albo usunięcie konta ustawia ją na `now()` → wszystkie stare tokeny
-- umierają w tej samej sekundzie.
--
-- 🔑 `DEFAULT to_timestamp(0)` (1970) I `NOT NULL` — TO NIE JEST OZDOBNIK.
--    Każdy dziś wystawiony token ma `iat` znacznie późniejszy niż 1970, więc po wgraniu
--    tej migracji **nikt nie zostaje wylogowany**. Bez wartości domyślnej kolumna byłaby
--    NULL-em, a pierwszy strażnik porównujący z NULL-em wyrzuciłby WSZYSTKICH pacjentów
--    naraz — w środku dnia pracy gabinetu.
--
-- ============================================================================
-- DLACZEGO SAMA KOLUMNA, BEZ STRAŻNIKA
-- ============================================================================
-- Trzy takty, każdy osobno bezpieczny i osobno odwracalny:
--   takt 1 (TA migracja) — kolumna + zapis daty przy zmianie hasła i usunięciu konta.
--                          Kolumna jest wypełniana, ale NIKT jej jeszcze nie czyta.
--                          Ryzyko: zerowe. Nie zmienia zachowania niczego.
--   takt 2              — `verifyPatientSession()` obok istniejącej funkcji, nieużywana.
--   takt 3              — przepięcie 31 tras + OTA do aplikacji.
-- Odwrotna kolejność (strażnik przed kolumną) wywala każdą trasę pacjenta na `42703`.
-- Ta sama pułapka co kolumna `avatar` w `/api/patients/me` (czerwiec) i `image_paths`
-- w migracji 192: brak kolumny wywraca CAŁY select, nie tylko brakujące pole.
--
-- ============================================================================
-- ODWRACALNOŚĆ
-- ============================================================================
-- `ALTER TABLE patients DROP COLUMN sessions_valid_from;`
-- Nic nie jest kasowane ani migrowane; dopóki nie ma strażnika, kolumna jest bierna.
-- ============================================================================

-- ── Stan PRZED ──────────────────────────────────────────────────────────────
SELECT count(*) AS pacjentow_razem,
       count(*) FILTER (WHERE password_hash IS NOT NULL) AS z_kontem
  FROM patients;

-- ── Kolumna ─────────────────────────────────────────────────────────────────
ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS sessions_valid_from TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0);

COMMENT ON COLUMN patients.sessions_valid_from IS
    'Tokeny pacjenta z iat WCZESNIEJSZYM niz ta data sa niewazne. Domyslnie 1970 = nikt '
    'nie jest wylogowany. Ustawiane na now() przy zmianie hasla i usunieciu konta. '
    'Czyta to verifyPatientSession() — patrz lib/jwt.ts.';

-- ── Weryfikacja ─────────────────────────────────────────────────────────────
-- Oczekiwane: kolumna istnieje, NOT NULL, default to_timestamp(0),
--             i ZERO pacjentow z data inna niz 1970 (nikt nie wylogowany).
SELECT column_name, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_name = 'patients' AND column_name = 'sessions_valid_from';

SELECT count(*) AS pacjentow_z_uniewaznionymi_sesjami
  FROM patients WHERE sessions_valid_from > to_timestamp(0);

-- ============================================================================
-- PO WGRANIU
-- ============================================================================
--   1. `pacjentow_z_uniewaznionymi_sesjami` MUSI byc 0 — inaczej ktos zostal wylogowany
--   2. kontrola negatywna: `GET /api/patients/me` z zywym tokenem → nadal 200
--      (kolumna dodana do tabeli, ktora czyta `select` — sprawdzic, ze nic nie peklo)
--   3. dopiero potem takt 2: strazniк w lib/jwt.ts
-- ============================================================================

-- ============================================================================
-- Migracja 191 — `employees.mfa_epoch`: reset 2FA ma REALNIE odbierać dostęp
-- Data: 2026-08-12
-- Wejście: plan napraw bezpieczeństwa, pozycja 1 (audyt 2026-08-06).
--
-- ⚠️ NUMERACJA: 190 zajęte (RLS sms_reminders). Ta migracja bierze 191.
--
-- ============================================================================
-- PROBLEM (zmierzony)
-- ============================================================================
--
-- `verifyMfaSessionToken` (src/lib/mfaSession.ts) sprawdzał wyłącznie podpis,
-- `userId` i termin ważności. Token sesji MFA żyje 8 h, a przy „Zaufaj temu
-- urządzeniu" — 30 DNI. Nie istniało nic, co mogłoby go unieważnić przed czasem:
--
--   * admin resetuje 2FA pracownikowi, któremu skradziono telefon
--     (`POST /api/admin/2fa/reset`) → złodziej ma dalej ważny token,
--   * pracownik sam wyłącza 2FA i włącza je ponownie na nowym telefonie
--     → stary token sprzed wyłączenia dalej przechodzi przez bramkę,
--   * pracownik usuwa zgubione urządzenie z listy → sesje na nim żyją dalej.
--
-- Komentarz w kodzie twierdził, że reset „clearuje wszystkie sesje przy
-- następnym middleware check". To była NIEPRAWDA — nie było czego sprawdzać.
--
-- ============================================================================
-- ROZWIĄZANIE
-- ============================================================================
--
-- Licznik unieważnień per pracownik. Token niesie `epoch` z chwili wystawienia;
-- bramka odrzuca token z epoką STARSZĄ niż bieżąca w bazie. Każde odebranie
-- drugiego składnika inkrementuje licznik → wszystkie wcześniejsze tokeny
-- (cookie weba I `X-MFA-Session` apki) umierają natychmiast.
--
-- Inkrementujemy w TRZECH miejscach (`src/lib/twoFactorService.ts`) — to są
-- wszystkie przejścia, w których pracownik traci czynnik:
--   1. `disableAll`   — pracownik wyłącza swoje 2FA,
--   2. `adminReset`   — admin resetuje cudze 2FA,
--   3. `removeDevice` — usunięcie AKTYWNEGO urządzenia (także gdy zostają inne;
--                       usunięcie urządzenia nieaktywowanego NIE liczy się,
--                       bo nikt nie miał jego sekretu).
--
-- ============================================================================
-- KOLEJNOŚĆ WDROŻENIA — dlaczego jest bezpieczna w OBIE strony
-- ============================================================================
--
-- Kod czyta kolumnę zapytaniem z FALLBACKIEM (`readMfaGate` w lib/mfaEpoch.ts):
-- gdy `mfa_epoch` jeszcze nie istnieje, odczyt powtarza się bez tej kolumny,
-- a epoka przyjmuje 0. To NIE jest ozdoba — bez fallbacku błąd `42703` wywalałby
-- CAŁY select, `totp_enabled` wychodziłoby jako `false` i bramka 2FA
-- przestałaby cokolwiek egzekwować dla nie-adminów (fail-open). Ta sama klasa,
-- co awaria `/api/patients/me` po dodaniu kolumny `avatar`.
--
-- W drugą stronę też jest bezpiecznie: token wystawiony PRZED migracją nie ma
-- pola `epoch` i jest traktowany jak `epoch = 0`, więc wgranie migracji nie
-- wylogowuje nikogo (kolumna startuje z DEFAULT 0).
--
-- Zalecane mimo to: migracja na OBA środowiska, potem deploy.
-- ============================================================================

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS mfa_epoch INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN employees.mfa_epoch IS
    'Licznik uniewaznien sesji MFA. Token sesji niesie epoke z chwili wystawienia; '
    'bramka odrzuca token ze starsza epoka. Inkrementowany przy disableAll, adminReset '
    'i usunieciu AKTYWNEGO urzadzenia 2FA. DEFAULT 0 = tokeny sprzed migracji zostaja wazne.';

-- Atomowa inkrementacja (wzorzec z migracji 174 — select-then-update rozjezdza
-- sie przy rownoleglych lambdach Vercela).
-- Zwraca NOWA wartosc albo NULL, gdy nie ma pracownika o takim user_id —
-- wolajacy MUSI odroznic te dwa przypadki (NULL = uniewaznienie NIE nastapilo).
CREATE OR REPLACE FUNCTION increment_mfa_epoch(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_new INTEGER;
BEGIN
    UPDATE employees
       SET mfa_epoch = COALESCE(mfa_epoch, 0) + 1
     WHERE user_id = p_user_id
    RETURNING mfa_epoch INTO v_new;

    RETURN v_new;
END;
$$;

-- Wylacznie tor serwerowy (service_role). Klient nigdy nie inkrementuje epoki.
REVOKE ALL ON FUNCTION increment_mfa_epoch(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_mfa_epoch(UUID) FROM anon;
REVOKE ALL ON FUNCTION increment_mfa_epoch(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_mfa_epoch(UUID) TO service_role;

-- ============================================================================
-- WERYFIKACJA PO WGRANIU (skopiuj do SQL Editora)
-- ============================================================================
--   SELECT count(*) AS pracownicy, count(*) FILTER (WHERE mfa_epoch = 0) AS epoka_zero
--     FROM employees;                       -- obie liczby musza byc rowne (18 = 18)
--
--   SELECT proname, proacl FROM pg_proc WHERE proname = 'increment_mfa_epoch';
--                                          -- w proacl WYLACZNIE service_role
-- ============================================================================

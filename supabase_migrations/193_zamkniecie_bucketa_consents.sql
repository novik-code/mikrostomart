-- ============================================================================
-- Migracja 193 — ZAMKNIĘCIE bucketa `consents` (etap C, krok 1 z 2)
-- Data: 2026-08-12
-- Wejście: plan napraw bezpieczeństwa, pozycja 4 · `PLAN_BUCKETY_2026-08-12.md`
--
-- 🔴 TO JEST TA MINUTA, DLA KTÓREJ POWSTAŁY ETAPY A I B.
-- Od tej chwili `https://<projekt>.supabase.co/storage/v1/object/public/consents/...`
-- przestaje wydawać pliki. W środku leżą e-Karty: PESEL, adres, wywiad zdrowotny
-- i podpis — 892 foldery, ścieżka `<numer_kartoteki>/<plik>.pdf`, numer kolejny,
-- czyli zgadywalny. Do dziś każdy, kto znał albo zgadł adres, pobierał dokument
-- bez logowania, bez klucza i bez śladu w audycie.
--
-- ============================================================================
-- WARUNKI WSTĘPNE — SPEŁNIONE I ZMIERZONE NA PRODUKCJI (2026-08-12)
-- ============================================================================
--   apka pacjenta   /api/patients/documents        16/16 adresów PODPISANYCH, otwiera 200
--   apka personelu  /api/employee/patient-consents 16/16 adresów PODPISANYCH, otwiera 200
--   panel web       grafik, biometryka, portal     przepięte na trasy-pośredniki
--   eksport RODO    czyta bajty ze Storage         200, ZIP 11 MB, 16/16 dokumentów
--   tablet zgód     szablony z `consent-pdfs`      NIE dotyczy tej migracji (bucket zostaje)
--   backfill        `*_path` w 5 torach            STRATA 0, każdy klucz ma swój obiekt
--
-- 🔑 Podpisany adres działa TAK SAMO na buckecie publicznym i prywatnym — dlatego
--    wszystko powyżej dało się sprawdzić PRZED tą migracją. Zamknięcie ma być nudnym
--    przełącznikiem, nie skokiem w ciemno.
--
-- ============================================================================
-- DLACZEGO `UPDATE`, A NIE `INSERT ... ON CONFLICT`
-- ============================================================================
-- Wzorzec z migracji 125 (`social_media_bucket_lockdown`). Wariant `INSERT ... ON
-- CONFLICT DO UPDATE` z migracji 184 CICHO nadpisałby `file_size_limit`
-- i `allowed_mime_types` wartościami z tego pliku — a tych dla `consents` nikt nigdy
-- świadomie nie ustawiał. Ruszamy JEDNĄ flagę i nic poza nią.
--
-- ⚠️ `social-media` ZOSTAJE PUBLICZNY (decyzja właściciela: sieci społecznościowe
--    pobierają plik ze swoich serwerów). Ta migracja go nie dotyka.
--
-- ============================================================================
-- ODWRACALNOŚĆ
-- ============================================================================
-- Jeden ruch: `UPDATE storage.buckets SET public = true WHERE id = 'consents';`
-- Nic nie jest kasowane ani migrowane. Najgorszy scenariusz to kilka minut
-- niedziałających linków i powrót przełącznikiem.
-- ============================================================================

-- ── Stan PRZED (do protokołu) ───────────────────────────────────────────────
SELECT id, public, file_size_limit, allowed_mime_types
  FROM storage.buckets
 WHERE id IN ('consents', 'consent-pdfs', 'task-images', 'social-media')
 ORDER BY id;

-- ── Zamknięcie ──────────────────────────────────────────────────────────────
UPDATE storage.buckets
   SET public = false
 WHERE id = 'consents';

-- ── Stan PO — `consents` musi mieć `public = false`, `social-media` `true` ───
SELECT id, public
  FROM storage.buckets
 WHERE id IN ('consents', 'consent-pdfs', 'task-images', 'social-media')
 ORDER BY id;

-- ============================================================================
-- WERYFIKACJA POZA SQL-em (obowiązkowa, zaraz po wgraniu)
-- ============================================================================
--   1. publiczny adres dowolnego obiektu z `consents`  → oczekiwane 400
--   2. adres PODPISANY tego samego obiektu             → oczekiwane 200
--   3. `/api/patients/documents` (token pacjenta)      → 200, wszystkie adresy z /object/sign/
--   4. `/api/employee/patient-consents` (sesja pracownika) → jak wyżej
--   5. `/api/patients/export-data`                     → 200 i komplet PDF-ów w ZIP-ie
--   6. kontrola negatywna: `social-media` publiczny plik → nadal 200
--
-- Dopiero po DOBIE stabilnej pracy: migracja 194 zamyka `task-images`
-- i `consent-pdfs`. Nie łączyć tych kroków — doba obserwacji jest po to, żeby
-- cicha awaria (`<img>` na martwym adresie to pusty prostokąt, nie błąd) zdążyła
-- się pokazać na oczach zespołu.
-- ============================================================================

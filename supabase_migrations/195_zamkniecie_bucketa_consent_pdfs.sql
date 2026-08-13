-- ============================================================================
-- Migracja 195 — ZAMKNIĘCIE bucketa `consent-pdfs` (etap C, krok 3 — OSTATNI)
-- Data: 2026-08-13
-- Wejście: plan napraw bezpieczeństwa, pozycja 4 · migracje 193 (`consents`) i 194 (`task-images`)
--
-- Ostatni publiczny bucket z dokumentami. W środku 22 obiekty: PUSTE formularze zgód
-- do podpisu na tablecie. Danych pacjenta tam NIE MA — to szablony. Zysk z zamknięcia
-- jest więc mniejszy niż przy `consents` (e-Karty z PESEL-em): znika enumeracja bucketa
-- i dostęp do szablonów WYCOFANYCH (21 nieaktywnych typów z 35).
--
-- ============================================================================
-- INWENTARYZACJA CZYTELNIKÓW — dwa pytania, które wywróciły migrację 194
-- ============================================================================
-- Pytanie 1: KTO CZYTA (nie kto pisze)?
--   tablet `/zgody/[token]`  → `consents[].file` z `/api/consents/verify`
--                              → `getConsentTypesFromDB` → PODPISANY ✅ (zmierzone)
--   pdf-mapper (admin)       → pośrednik `documents/file?type=consent-template`
--                              → `displayUrlFor`, TTL 3600 ✅
--   `ScheduleTab.tsx:152`    → mapuje `file: row.pdf_file` z publicznej trasy,
--                              ale NIGDZIE go nie czyta ⚪ martwe pole
--   tablet `CONSENT_TYPES`   → jw. — `file` nadpisane, `fetch` idzie po `consents` ⚪
--   cron retencyjny          → NIE dotyka bucketa (komentarz w trasie mówi to wprost) ✅
--   apka mobilna             → nie dotyka wcale (`grep` w repo apki: zero trafień) ✅
--
-- Pytanie 2: CZY KLIENT ODSYŁA PRZECZYTANĄ WARTOŚĆ?
--   NIE. `PUT /api/admin/consent-mappings` wysyła `{ consent_key, fields }`.
--   `POST` niesie `pdf_file`, ale wzięty z odpowiedzi UPLOADU, nie z odczytu.
--   Pułapki round-tripu, która wywróciła `task-images`, tutaj NIE MA.
--
-- ============================================================================
-- ⚠️ DŁUG, KTÓRY ZOSTAJE PO TEJ MIGRACJI (świadomie, osobne zadanie)
-- ============================================================================
-- `GET /api/admin/consent-mappings` jest **PUBLICZNY** (bez auth — komentarz w trasie:
-- „Public read (consent signing page needs it)") i robi `select('*')`, więc oddaje
-- `pdf_file` i `pdf_path` wszystkich 14 aktywnych typów każdemu z internetu.
-- Po tej migracji te adresy stają się MARTWE (400) — nikt ich nie czyta, bo tablet
-- bierze podpis z `/api/consents/verify`. Zostają jako martwe pole i mina na przyszłość.
-- 🔑 Świadomie NIE podpisujemy tej trasy: podpisywanie w trasie bez uwierzytelnienia
--    unieważniłoby sens zamknięcia — każdy z internetu generowałby sobie ważny adres
--    do każdego aktywnego szablonu. Właściwa naprawa to zdjęcie kolumn z adresami
--    z publicznej odpowiedzi, a nie ich podpisanie.
--
-- ============================================================================
-- ✅ WGRANA NA PRODUKCJI 2026-08-13 — WYNIK
-- ============================================================================
-- Stan PRZED (odczytany): aktywne_bez_klucza 0 · aktywnych 14 · consent-pdfs TRUE
-- Stan PO (odczytany, nie z komunikatu „Success"):
--   consents FALSE · consent-pdfs FALSE · task-images FALSE · social-media TRUE
--
-- Weryfikacja natychmiast po zamknięciu:
--   1. tablet — realny token → `/api/consents/verify` → adres PODPISANY,
--      pobranie zwróciło `%PDF` ✅
--   2. wszystkie szablony przez podpis → **14/14 `%PDF`** ✅
--   3. publiczny adres Z CACHE-BUSTEREM → **400** (6 obiektów: 6 × 400) ✅
--      bez bustera → 200 `cf-cache-status: HIT` (znana pułapka, patrz migracja 194)
--   4. kontrola negatywna `social-media` → **200 `MISS`** (świeże pobranie,
--      nie z cache) — bucket celowo zostaje publiczny ✅
--
-- 🏁 ETAP C ZAMKNIĘTY. Żaden bucket z dokumentami nie jest publiczny.
--
-- ============================================================================
-- WARUNKI WSTĘPNE — ZMIERZONE NA PRODUKCJI PRZED WGRANIEM
-- ============================================================================
--   [x] 14 AKTYWNYCH typów zgód, **14/14 ma `pdf_path`** (0 bez klucza)
--   [x] 14/14 wskazuje na bucket `consent-pdfs` (0 statyków z `public/zgody/` wśród aktywnych)
--   [x] `/api/consents/verify` na realnym tokenie → adres **PODPISANY**
--   [x] **14/14 szablonów pobranych podpisem, każdy zaczyna się od `%PDF`**
--       (nie sam kod 200 — magic bytes, bo 200 potrafi oddać stronę błędu)
--
-- ============================================================================
-- ODWRACALNOŚĆ
-- ============================================================================
-- Jeden ruch: `UPDATE storage.buckets SET public = true WHERE id = 'consent-pdfs';`
-- 🔴 Stawka przy awarii: pacjent siedzi w fotelu i nie ma czego podpisać. Dlatego
--    weryfikacja po wgraniu jest natychmiastowa, a nie „sprawdzimy jutro".
-- ============================================================================

-- ── Kontrola wstępna: aktywne typy zgód BEZ klucza obiektu (oczekiwane 0) ────
SELECT count(*) AS aktywne_bez_klucza
  FROM consent_field_mappings
 WHERE is_active = true
   AND btrim(coalesce(pdf_path, '')) = '';

-- ── Stan PRZED ──────────────────────────────────────────────────────────────
SELECT id, public FROM storage.buckets
 WHERE id IN ('consents', 'consent-pdfs', 'task-images', 'social-media') ORDER BY id;

-- ── Zamknięcie ──────────────────────────────────────────────────────────────
UPDATE storage.buckets
   SET public = false
 WHERE id = 'consent-pdfs';

-- ── Stan PO — oczekiwane: trzy FALSE, `social-media` TRUE ────────────────────
SELECT id, public FROM storage.buckets
 WHERE id IN ('consents', 'consent-pdfs', 'task-images', 'social-media') ORDER BY id;

-- ============================================================================
-- WERYFIKACJA POZA SQL-em (natychmiast po wgraniu)
-- ============================================================================
--   1. `/api/consents/verify` na realnym tokenie → adres podpisany, pobranie → `%PDF`
--   2. wszystkie 14 szablonów przez podpis → 14/14 `%PDF`
--   3. publiczny adres szablonu **Z CACHE-BUSTEREM** → 400
--      🪤 BEZ bustera zobaczysz 200 z `cf-cache-status: HIT` — cache krawędziowy
--         Cloudflare przeżywa zamknięcie do wygaśnięcia TTL. Ta sama pułapka
--         złapała mnie przy migracji 194; bez cache-bustera pomiar KŁAMIE.
--   4. kontrola negatywna: `social-media` publiczny plik → nadal 200
--
-- ✅ Po tej migracji ŻADEN bucket z dokumentami nie jest publiczny.
--    Publiczny zostaje wyłącznie `social-media` — decyzja właściciela
--    (sieci społecznościowe pobierają plik ze swoich serwerów).
-- ============================================================================

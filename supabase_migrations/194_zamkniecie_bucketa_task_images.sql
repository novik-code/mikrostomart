-- ============================================================================
-- Migracja 194 — ZAMKNIĘCIE bucketa `task-images` (etap C, krok 2)
-- Data: 2026-08-13
-- Wejście: plan napraw bezpieczeństwa, pozycja 4 · migracja 193 (krok 1)
--
-- Zamyka publiczny dostęp do zdjęć doklejanych do zadań personelu. Zmierzone
-- w migracji 192: 252 obiekty w `task-images/tasks`, 299 wierszy `employee_tasks`,
-- 202 elementy w `image_urls`. Ścieżka to `tasks/<timestamp>-<6 znaków>.jpg` —
-- trudniejsza do zgadnięcia niż kolejny numer kartoteki z `consents`, ale zdjęcia
-- usterek i zadań potrafią pokazywać gabinet, dokumenty na biurku i twarze.
--
-- ============================================================================
-- 🔴 DLACZEGO TA MIGRACJA BYŁA WSTRZYMANA (13.08) — I CO TO ZDJĘŁO
-- ============================================================================
-- Fakt-check złapał, że warunek wejścia NIE był spełniony, mimo że migracja 192
-- nauczyła ZAPIS wyliczać klucze. Nietknięty został ODCZYT:
-- `/api/employee/tasks` oddawało surowe `image_urls` z bazy, czyli adresy PUBLICZNE.
-- Zamknięcie bucketa zgasiłoby galerie u OBU klientów naraz:
--   • apka 1.2.0 ze sklepu — `lib/tasks.ts:187` renderuje `image_url` + `image_urls`,
--     a `lib/api.ts:1216` typuje odpowiedź uploadu jako `{ url }` i pola `path` NIE ZNA;
--   • panel webowy — `TasksTab.tsx:1921` i `:2251` wkładają te adresy prosto w `<img src>`.
--     (Wcześniejszy zapis „panel przeszedł na klucze" był nieścisły — web WYSYŁA
--      `image_paths`, ale CZYTA adresy dokładnie tak samo jak apka.)
--
-- Zdjęte po stronie weba, BEZ nowej binarki apki (`lib/taskImages.ts`):
--   • odczyt oddaje adresy PODPISANE (900 s) wyliczone z kolumny `image_paths`;
--   • zapis normalizuje wejście — podpisany adres od klienta wraca do bazy jako
--     adres kanoniczny, więc token nie osiada w kolumnie i `task_history` nie notuje
--     „zmiany zdjęcia" przy każdym zapisie (diff porównuje stringi);
--   • kliencki `image_paths` w ciele żądania leci do kosza — klucz podaje wyłącznie
--     serwer, inaczej dałoby się podstawić cudze zdjęcie zadania.
-- Pokrycie: `taskImages.test.ts` (13 asercji, cofka: 5 pada bez naprawy)
-- + `storagePathWiring.test.ts` (okablowanie obu stron, cofka dowiedziona).
--
-- ============================================================================
-- WARUNKI WSTĘPNE — WYMAGAJĄ POMIARU NA PRODUKCJI PRZED WGRANIEM
-- ============================================================================
--   [ ] web z naprawą odczytu JEST na produkcji  → `/api/health?secret=` → `deployment`
--   [ ] `GET /api/employee/tasks` (sesja pracownika) → każdy element `image_urls`
--       zawiera `/object/sign/task-images/` i ANI JEDEN `/object/public/task-images/`
--   [ ] otwarcie takiego adresu → 200
--   [ ] kontrola negatywna: adres publiczny tego samego obiektu → 200 (jeszcze otwarty)
--   [ ] backfill `image_paths`: ZERO wierszy z niepustym `image_urls` i pustym
--       `image_paths` (zapytanie kontrolne niżej) — wiersz bez klucza NIE MA
--       z czego wyliczyć podpisu i zgaśnie
--
-- 🔑 Podpisany adres działa TAK SAMO na buckecie publicznym i prywatnym — całość
--    powyżej sprawdza się PRZED zamknięciem. To ma być nudny przełącznik.
--
-- ⚠️ `consent-pdfs` (szablony zgód do podpisu na tablecie) NIE wchodzi do tej
--    migracji. Osobny tor, osobny warunek wejścia — łączenie ich znaczyłoby, że
--    przy awarii nie wiadomo, który bucket ją wywołał.
--
-- ============================================================================
-- ODWRACALNOŚĆ
-- ============================================================================
-- Jeden ruch: `UPDATE storage.buckets SET public = true WHERE id = 'task-images';`
-- Nic nie jest kasowane ani migrowane.
-- ============================================================================

-- ── Kontrola wstępna: wiersze, które NIE MAJĄ z czego wyliczyć podpisu ───────
-- 🪤 `image_urls` ma INNY TYP w każdym środowisku (prod TEXT[], demo jsonb),
--    więc iterujemy przez `to_jsonb()` — tak samo jak migracja 192.
--    Oczekiwane: 0. Jeśli nie 0 — NAJPIERW `SELECT storage_backfill_apply();`
SELECT count(*) AS wiersze_bez_kluczy
  FROM employee_tasks t
 WHERE EXISTS (
           SELECT 1
             FROM jsonb_array_elements_text(coalesce(to_jsonb(t.image_urls), '[]'::jsonb)) AS el(val)
            WHERE btrim(coalesce(el.val, '')) <> ''
       )
   AND coalesce(array_length(t.image_paths, 1), 0) = 0;

-- ── Stan PRZED (do protokołu) ───────────────────────────────────────────────
SELECT id, public, file_size_limit, allowed_mime_types
  FROM storage.buckets
 WHERE id IN ('consents', 'consent-pdfs', 'task-images', 'social-media')
 ORDER BY id;

-- ── Zamknięcie ──────────────────────────────────────────────────────────────
-- `UPDATE`, nie `INSERT ... ON CONFLICT` — wzorzec z migracji 125 i 193.
-- Wariant z migracji 184 cicho nadpisałby `file_size_limit` i `allowed_mime_types`
-- wartościami z tego pliku, a tych dla `task-images` nikt świadomie nie ustawiał.
UPDATE storage.buckets
   SET public = false
 WHERE id = 'task-images';

-- ── Stan PO ─────────────────────────────────────────────────────────────────
-- Oczekiwane: `consents` false, `task-images` false,
--             `consent-pdfs` TRUE (osobny tor), `social-media` TRUE (decyzja właściciela).
SELECT id, public
  FROM storage.buckets
 WHERE id IN ('consents', 'consent-pdfs', 'task-images', 'social-media')
 ORDER BY id;

-- ============================================================================
-- WERYFIKACJA POZA SQL-em (obowiązkowa, zaraz po wgraniu)
-- ============================================================================
--   1. publiczny adres obiektu z `task-images`            → oczekiwane 400
--   2. adres PODPISANY tego samego obiektu                → oczekiwane 200
--   3. `GET /api/employee/tasks` (sesja pracownika)       → 200, adresy z /object/sign/
--   4. panel webowy → zakładka Zadania → miniatury zdjęć  → widoczne
--   5. apka → Zadania → zadanie ze zdjęciem               → galeria się ładuje
--   6. EDYCJA zadania ze zdjęciem w apce (zapisz bez zmian w zdjęciach)
--      → w bazie `image_urls` BEZ `token=`, a `task_history` BEZ wpisu o zdjęciu
--   7. kontrola negatywna: `consent-pdfs` publiczny plik  → nadal 200
--
-- 🪤 Punkt 6 jest tym, który łatwo pominąć, a psuje się cicho: token w kolumnie
--    umiera po 15 minutach i widać to dopiero następnego dnia.
--
-- ⏭️ Zostaje `consent-pdfs` — ostatni publiczny bucket z dokumentami.
-- ============================================================================

/**
 * Strażnik okablowania kluczy Storage (migracja 192, etap A zamykania bucketów).
 *
 * 🔴 CZEGO PILNUJE. Buckety `consents` i `task-images` są publiczne — kto zna adres,
 * pobiera e-Kartę z PESEL-em bez logowania i bez śladu. Zamknięcie ich wymaga, żeby
 * KAŻDY pisarz zapisywał KLUCZ obiektu (`*_path`), a nie tylko gotowy adres.
 *
 * Pisarzy jest pięciu i są rozrzuceni po trzech obszarach. Pominięcie jednego nie
 * wywala niczego dzisiaj — objawi się dopiero po zamknięciu bucketa, jako dokument,
 * którego nie da się otworzyć. Dokładnie ta klasa błędu wracała trzy razy przy pushu
 * („jedna naprawa nie wystarczy — policz wszystkich wywołujących").
 *
 * 🪤 KAŻDA ASERCJA MÓWI „ZNALAZŁEM N MIEJSC". Strażnik, który po refaktorze przestaje
 * cokolwiek znajdować, świeci na zielono i jest gorszy niż jego brak.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

/** Pisarze do bucketa `consents` — dokumenty pacjenta (zgody i e-Karty). */
const PISARZE_CONSENTS = [
    { plik: 'src/app/api/intake/submit/route.ts', kolumna: 'pdf_path' },
    { plik: 'src/app/api/intake/generate-pdf/route.ts', kolumna: 'pdf_path' },
    { plik: 'src/app/api/consents/sign/route.ts', kolumna: 'file_path' },
];

/** Pisarze kluczy zdjęć zadań — trasa zapisu wylicza je z adresów przysłanych przez apkę. */
const PISARZE_ZADAN = [
    'src/app/api/employee/tasks/route.ts',
    'src/app/api/employee/tasks/[id]/route.ts',
];

describe('Strażnik: klucze obiektów Storage', () => {
    it('wszyscy trzej pisarze dokumentów pacjenta zapisują kolumnę *_path', () => {
        const bez: string[] = [];
        for (const { plik, kolumna } of PISARZE_CONSENTS) {
            const src = read(plik);
            // sanity: to naprawdę jest pisarz do tego bucketa (wzorzec nie zmurszał)
            expect(src, `${plik} przestał wgrywać do bucketa consents`).toMatch(/from\('consents'\)/);
            if (!src.includes(`${kolumna}:`)) bez.push(`${plik} (${kolumna})`);
        }
        expect(
            bez,
            `pisarze bez zapisu klucza: ${bez.join(', ')} — po zamknięciu bucketa ich dokumenty `
            + 'będą nie do otwarcia, a backfill ich nie dogoni, bo dotyczy tylko starych wierszy.',
        ).toEqual([]);
        expect(PISARZE_CONSENTS).toHaveLength(3);
    });

    it('obie trasy zapisu zadań wyliczają klucze przez bazę, nie własnym parserem', () => {
        for (const plik of PISARZE_ZADAN) {
            const src = read(plik);
            expect(src, `${plik} nie woła resolveObjectPaths`).toContain('resolveObjectPaths');
            expect(src, `${plik} nie zapisuje image_paths`).toContain('image_paths');
        }
        expect(PISARZE_ZADAN).toHaveLength(2);
    });

    it('🔴 upload-image nadal oddaje `url` — kontrakt apki 1.2.0 ze sklepu', () => {
        // Apka ze sklepu robi `if (up.url) setImageUrls(...)`. Usunięcie pola albo
        // zamiana na sam klucz wygasza zdjęcia zadań w zainstalowanych binarkach.
        const src = read('src/app/api/employee/tasks/upload-image/route.ts');
        expect(src).toMatch(/url:\s*urlData\.publicUrl/);
        expect(src, 'klucz ma dochodzić jako pole DODATKOWE').toMatch(/path\s*\}\)/);
    });

    it('trasa-pośrednik sprawdza WŁASNOŚĆ dokumentu w bazie', () => {
        const src = read('src/app/api/patients/documents/[id]/file/route.ts');
        // Filtr po pacjencie musi być częścią zapytania — dwa razy, bo dwa rodzaje dokumentu.
        const filtry = src.match(/\.eq\('prodentis_patient_id',\s*prodentisId\)/g) ?? [];
        expect(
            filtry.length,
            'bez filtra po pacjencie trasa jest generatorem podpisów do CUDZYCH e-Kart',
        ).toBe(2);
        expect(src, 'brak śladu w rejestrze dostępu').toContain('patient_document_access_log');
    });

    it('nie powstał DRUGI parser adresów w TypeScripcie', () => {
        // Reguła „adres → klucz" żyje w SQL (`resolve_object_path`, migracja 192).
        // Kopia w TS rozjedzie się z backfillem przy pierwszej korekcie — tak zginął
        // parytet forka planisty CareFlow.
        const podejrzani = ['src/lib/privateStorage.ts', ...PISARZE_ZADAN, 'src/app/api/patients/documents/[id]/file/route.ts'];
        const naruszenia = podejrzani.filter(p => /object\/public\/[^'"`]*\$\{|split\(['"]\/object\/public\//.test(read(p)));
        expect(naruszenia, `pliki parsujące adres samodzielnie: ${naruszenia.join(', ')}`).toEqual([]);
        expect(podejrzani.length).toBe(4);
    });

    it('trasa personelu waliduje kształt ścieżki, zanim dotknie zapytania', () => {
        // 🔴 Pierwsza wersja sklejała filtr PostgREST stringiem z parametru `path`
        // (`.or('image_paths.cs.{"'+path+'"}')`). Przecinek albo cudzysłów w adresie
        // rozbijał wyrażenie filtra — wstrzyknięcie, nie kosmetyka.
        const src = read('src/app/api/employee/documents/file/route.ts');
        expect(src, 'brak twardego wzorca ścieżki zdjęcia').toMatch(/\^tasks\\\/\[A-Za-z0-9\._-\]/);
        expect(src, 'wrócił sklejany filtr .or(...)').not.toMatch(/\.or\(`/);
        // własność sprawdzana w bazie, nie po kształcie
        expect(src).toMatch(/\.eq\('image_path', path\)/);
        expect(src).toMatch(/\.contains\('image_paths', \[path\]\)/);
    });

    it('dokumenty pacjenta są audytowane ZAWSZE, tryb redirect tylko dla zdjęć zadań', () => {
        const src = read('src/app/api/employee/documents/file/route.ts');
        // redirect (bez audytu) musi stać w gałęzi task-image, czyli PRZED rozgałęzieniem
        // na consent/ekarta — inaczej dałoby się nim ominąć ślad przy e-Karcie.
        // 🪤 Pierwsza wersja tej asercji sprawdzała tylko `iRedirect < iDokument` — a to
        // przechodzi TAKŻE wtedy, gdy redirect wycieknie NA GÓRĘ trasy i zacznie omijać
        // audyt dla e-Karty. Warunek musi zamykać go WEWNĄTRZ gałęzi zdjęć zadań.
        const iTaskImage = src.indexOf("if (typ === 'task-image')");
        const iRedirect = src.indexOf("sp.get('redirect')");
        const iDokument = src.indexOf("if (typ === 'consent')");
        expect(iTaskImage, 'brak gałęzi zdjęć zadań').toBeGreaterThan(-1);
        expect(iRedirect, 'brak trybu redirect').toBeGreaterThan(-1);
        expect(iRedirect > iTaskImage && iRedirect < iDokument,
            'tryb redirect musi siedzieć WEWNĄTRZ gałęzi task-image — poza nią omija audyt dokumentu',
        ).toBe(true);
        expect((src.match(/sp\.get\('redirect'\)/g) || []).length, 'redirect ma być JEDEN').toBe(1);
        expect((src.match(/logAudit\(\{/g) || []).length, 'oczekiwane dwa wpisy audytu').toBe(2);
    });

    it('panel nie wstawia już publicznego adresu wprost w href', () => {
        const czytelnicy: Array<[string, RegExp]> = [
            ['src/app/pracownik/components/ScheduleTab.tsx', /href=\{c\.file_url\}/],
            ['src/app/admin/biometric-signatures/page.tsx', /href=\{selected\.file_url\}/],
            ['src/app/[locale]/strefa-pacjenta/dashboard/page.tsx', /href=\{doc\.fileUrl\}\s*\n/],
        ];
        const zle = czytelnicy.filter(([p, re]) => re.test(read(p))).map(([p]) => p);
        expect(zle, `czytelnicy z gołym adresem: ${zle.join(', ')}`).toEqual([]);
        // …i sanity: każdy z nich NAPRAWDĘ woła pośrednika
        const wolajacy = czytelnicy.filter(([p]) => /otworzDokument(Personelu|Pacjenta)/.test(read(p)));
        expect(wolajacy.length, 'strażnik przestał widzieć czytelników').toBe(3);
    });

    it('cache-buster `?t=` nie wrócił do adresu dokumentu', () => {
        // Na podpisanym adresie daje drugi znak zapytania i Storage odpowiada 400.
        const src = read('src/app/pracownik/components/ScheduleTab.tsx');
        expect(src).not.toMatch(/pdfUrl\s*\+\s*'\?t='/);
    });

    it('🔴 eksport RODO PRZERYWA przy braku dokumentu, zamiast oddać pusty ZIP', () => {
        // Obie pętle robiły `fetch(publicznyAdres)` + `console.warn` + `continue`.
        // Po zamknięciu bucketa pacjent z art. 15 dostałby ZIP ze statusem 200,
        // bez ani jednego PDF-a i bez sygnału — dla niego i dla nas.
        const src = read('src/app/api/patients/export-data/route.ts');

        expect(src, 'eksport nie czyta bajtów ze Storage').toContain('readObjectBytes');
        expect(src, 'brak zbierania braków').toContain('brakujace');
        // Przerwanie MUSI istnieć i mieć status inny niż 200.
        // 🪤 Warunek przypięty CO DO ZNAKU — asercja „gdzieś jest `brakujace.length > 0`
        // i gdzieś dalej 503" przechodziła także po podmianie na `if (false && ...)`.
        // Zmierzone cofką, nie wydedukowane.
        expect(src).toContain('if (brakujace.length > 0) {');
        expect(src).toMatch(/if \(brakujace\.length > 0\) \{[\s\S]{0,700}?status:\s*503/);

        // …i nie wolno wrócić do cichego pomijania dokumentu pacjenta
        const cicheContinue = src.match(/console\.warn\([^)]*PDF[^)]*\)[\s\S]{0,80}?continue;/g) ?? [];
        expect(cicheContinue, 'wrócił `warn` + `continue` na dokumencie pacjenta').toEqual([]);

        // sanity: OBIE kategorie trafiają na listę do skompletowania
        expect(src).toMatch(/patientConsents\.map/);
        expect(src).toMatch(/intakeSubmissions\.map/);
        expect(src).toContain('skompletujDokumenty');

        // 🪤 Ten strażnik pilnuje wyłącznie OKABLOWANIA. Samo zachowanie („brak pliku
        // = brak paczki") sprawdza `patientExportDocs.test.ts` — WYKONANIEM, bo cofka
        // pokazała, że cztery różne regresje przechodzą przez asercje na treści pliku.
    });

    it('szablony zgód: JEDNA składarka adresu, klucz zapisywany przy uploadzie', () => {
        // 🪤 Były DWIE niezgodne implementacje tej samej reguły — w `consents/verify`
        // i w `pdf-mapper`. Poprawka w jednej zostawiała mapper na martwym adresie.
        const mapper = read('src/app/admin/pdf-mapper/page.tsx');
        expect(mapper, 'wróciła druga składarka adresu').not.toMatch(/const getPdfUrl = /);
        expect(mapper, 'mapper nie bierze adresu z pośrednika').toContain('type=consent-template');
        // klucz z odpowiedzi uploadu MUSI trafiać do bazy — bez niego nowy szablon
        // nie przeżyje zamknięcia bucketa
        expect(mapper).toMatch(/pdf_path = uploadData\.storagePath/);
        expect(mapper).toMatch(/label: newLabel, pdf_file, pdf_path/);

        // trasa mapowań musi ten klucz przyjąć — i przy tworzeniu, i przy podmianie
        const trasa = read('src/app/api/admin/consent-mappings/route.ts');
        expect(trasa).toMatch(/pdf_path \? \{ pdf_path \}/);
        expect(trasa).toMatch(/updates\.pdf_path !== undefined/);

        // 🪤 Samo ZACHOWANIE (klucz → podpis, brak klucza → statyk) sprawdza
        // `consentTemplateUrl.test.ts` — wykonaniem, nie grepem.
        expect(read('src/lib/consentTypes.ts')).toContain('wybierzAdresSzablonu');
    });

    it('migracja 192 iteruje image_urls niezależnie od typu kolumny', () => {
        // 🔴 `employee_tasks.image_urls` MA INNY TYP W KAŻDYM ŚRODOWISKU (zmierzone
        // w information_schema): produkcja TEXT[], demo jsonb. Każde podejście „na jeden
        // typ" wywala CAŁĄ migrację w drugim środowisku — `jsonb_typeof` daje 42883 na
        // TEXT[], a `unnest(coalesce(...))` daje 42804 na jsonb (złapane na demo).
        // Jedyne wyjście: `to_jsonb()` przed iteracją.
        const sql = read('supabase_migrations/192_storage_paths_backfill.sql');
        const bezpieczne = sql.match(/jsonb_array_elements_text\(coalesce\(to_jsonb\(t\.image_urls\)/g) ?? [];
        expect(
            bezpieczne.length,
            'oba miejsca iterujące image_urls (raport i backfill) muszą iść przez to_jsonb',
        ).toBe(2);
        const wprost = sql.match(/jsonb_typeof\(\s*t?\.?image_urls|jsonb_array_elements_text\(\s*t?\.?image_urls|unnest\(\s*(coalesce\()?t\.image_urls/g) ?? [];
        expect(wprost, 'iteracja po surowej kolumnie działa tylko w jednym środowisku').toEqual([]);
    });
});

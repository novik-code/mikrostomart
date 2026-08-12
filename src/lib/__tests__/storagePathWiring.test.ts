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

    it('migracja 192 nie używa funkcji jsonb na kolumnie TEXT[]', () => {
        // `employee_tasks.image_urls` to TEXT[] (migracja 047). `jsonb_typeof` na niej
        // wywala CAŁĄ migrację przy tworzeniu funkcji (42883) — a PostgREST tego nie
        // pokazuje, bo oddaje TEXT[] jako tablicę JSON.
        const sql = read('supabase_migrations/192_storage_paths_backfill.sql');
        const zle = sql.match(/jsonb_typeof\(\s*t?\.?image_urls|jsonb_array_elements_text\(\s*t?\.?image_urls/g) ?? [];
        expect(zle, 'jsonb_* na kolumnie TEXT[] — migracja się nie zainstaluje').toEqual([]);
        expect(sql, 'raport musi iterować tablicę przez unnest').toContain('unnest(');
    });
});

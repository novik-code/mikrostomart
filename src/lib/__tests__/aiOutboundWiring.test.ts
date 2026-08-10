/**
 * Strażnik: nic z danymi pacjenta nie wychodzi do modelu językowego bez pseudonimizacji.
 *
 * 🔴 DLACZEGO ISTNIEJĄCY STRAŻNIK TEGO NIE ŁAPAŁ. `emailAiPrivacyWiring.test.ts` szuka
 * ciągu `chat/completions` — czyli wywołań przez surowy `fetch`. Wywołanie przez SDK
 * wygląda inaczej: `openai.chat.completions.create(...)` ma KROPKI, nie ukośnik.
 * Trasa dokładająca nowy kanał do modelu przechodziła więc na zielono.
 *
 * Ten test skanuje CAŁE drzewo `src/` i wymaga, żeby każdy plik wołający model
 * albo pseudonimizował treść, albo stał na jawnej liście zwolnień z uzasadnieniem.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.join(process.cwd(), 'src');

/** Wzorce wywołania modelu — SDK i surowy fetch. */
const WZORCE_MODELU = [
    /chat\.completions\.create/,
    /chat\/completions/,
    /audio\/transcriptions/,
    /responses\.create/,
];

/**
 * Sygnały, że plik dotyka danych pacjenta. Sam fakt wołania modelu NIE wystarcza do
 * oskarżenia — większość kanałów to treści marketingowe (blog, media społecznościowe,
 * opisy produktów), które żadnej kartoteki nie widzą.
 *
 * 🪤 Ten podział jest tu celowo: pierwsza wersja testu opierała się na mojej ręcznej
 * liście zwolnień i od razu okazała się błędna — wpisałem do niej pliki, które modelu
 * w ogóle nie wołają. Warunek liczony z KODU jest odporny na takie pomyłki.
 */
const SYGNALY_PACJENTA = [
    /from\('patients'\)/,
    // 🪤 Tylko realne WYWOŁANIE Prodentisa. Wzorzec `PRODENTIS_` był za szeroki:
    // trafiał w nazwę zmiennej środowiskowej `SMILE_UNLIMITED_PRODENTIS_IDS`
    // (biała lista limitów symulatora) i fałszywie oskarżał `lib/smile/pipeline.ts`,
    // który wysyła do modelu ZDJĘCIE i polecenie kontroli jakości — bez danych osobowych.
    /prodentisFetch|\/api\/patient\//,
    /from\('employee_tasks'\)/,
    /from\('patient_/,
    /getEmail|imapService|fullEmail/,
];

/**
 * Kanały dotykające danych pacjenta, które ŚWIADOMIE nie pseudonimizują — z powodem.
 * Lista zamknięta: nowy taki kanał bez scrubbera = czerwony test.
 */
const ZWOLNIENIA: Record<string, string> = {
    'app/api/employee/stt/route.ts':
        'Wysyła PLIK AUDIO, nie tekst. Scrubber pracuje na tekście, więc nie da się go tu zastosować — '
        + 'wyciekiem jest samo nagranie. Rozstrzygnięcie (wyłączyć / zostawić / zmienić dostawcę) '
        + 'to decyzja właściciela, sesja 8 planu napraw.',
};

function zbierzPliki(dir: string): string[] {
    const acc: string[] = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '__tests__' || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) acc.push(...zbierzPliki(full));
        else if (/\.tsx?$/.test(e.name)) acc.push(full);
    }
    return acc;
}

function wolaModel(src: string): boolean {
    return WZORCE_MODELU.some(w => w.test(src));
}

function maScrubber(src: string): boolean {
    // `emailAiPrivacy` eksportuje m.in. prepareEmailForModel i prepareLearningPairForModel —
    // dopasowanie po nazwie MODUŁU jest odporne na dokładanie kolejnych funkcji.
    return /createScrubber|emailAiPrivacy|prepareEmailForModel|scrubDeep|\bscrub\(/.test(src);
}

/** Czy plik w ogóle widzi dane pacjenta. */
function dotykaPacjenta(src: string): boolean {
    return SYGNALY_PACJENTA.some(w => w.test(src));
}

describe('Strażnik: wyjście do modelu językowego', () => {
    const pliki = zbierzPliki(SRC).filter(f => wolaModel(fs.readFileSync(f, 'utf8')));

    it('wykrywa realne kanały do modelu (kontrola pozytywna)', () => {
        // Gdyby wzorce przestały pasować, cały test cicho przestałby czegokolwiek pilnować.
        expect(pliki.length).toBeGreaterThan(3);
    });

    it('każdy kanał DOTYKAJĄCY DANYCH PACJENTA pseudonimizuje albo jest zwolniony', () => {
        const winni = pliki
            .map(f => path.relative(SRC, f))
            .filter(rel => !(rel in ZWOLNIENIA))
            .filter(rel => {
                const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
                return dotykaPacjenta(src) && !maScrubber(src);
            });

        expect(
            winni,
            'Te pliki wysyłają dane pacjenta do modelu bez pseudonimizacji:\n' + winni.join('\n')
            + '\n\nDodaj createScrubber() albo wpisz plik do ZWOLNIENIA z uzasadnieniem.'
        ).toEqual([]);
    });

    it('lista zwolnień nie gnije — każdy wpis nadal woła model i widzi dane pacjenta', () => {
        const martwe = Object.keys(ZWOLNIENIA).filter(rel => {
            const p = path.join(SRC, rel);
            if (!fs.existsSync(p)) return true;
            const src = fs.readFileSync(p, 'utf8');
            return !wolaModel(src);
        });
        expect(martwe, 'Wpis w ZWOLNIENIA bez odpowiednika w kodzie — usuń go.').toEqual([]);
    });

    it('dyktowanie dokumentacji nie odwraca pseudonimizacji przed modelem', () => {
        const src = fs.readFileSync(path.join(SRC, 'lib/assistantActions.ts'), 'utf8');
        // Trasa asystenta robi restoreDeep na argumentach narzędzi (słusznie — do bazy
        // ma iść nazwisko), więc TO narzędzie dostaje już odtworzony tekst i musi
        // zeskrubować go samo, zanim wyśle drugi raz do modelu.
        expect(src).toContain('createScrubber');
        expect(src).not.toMatch(/content:\s*args\.raw_text/);
    });

    it('szybkie dodawanie zadań scrubuje dyktowaną notatkę', () => {
        const src = fs.readFileSync(path.join(SRC, 'app/api/employee/tasks/ai-parse/route.ts'), 'utf8');
        expect(src).toContain('createScrubber');
        expect(src).not.toMatch(/role:\s*'user',\s*content:\s*text\s*\}/);
        // restore MUSI iść na strukturze, nie na gotowym JSON-ie
        expect(src).toContain('restoreDeep');
    });
});

describe('Strażnik: wylogowanie kasuje token push pacjenta', () => {
    it('trasa ma handler DELETE i kasuje wyłącznie własny wpis', () => {
        const src = fs.readFileSync(path.join(SRC, 'app/api/patients/push-token/route.ts'), 'utf8');
        expect(src).toContain('export async function DELETE');
        // dopasowanie po tokenie ORAZ po właścicielu — inaczej znajomość cudzego tokenu
        // pozwala zdalnie wyciszyć czyjeś urządzenie
        expect(src).toMatch(/\.eq\('token', token\)[\s\S]{0,120}\.eq\('patient_id', payload\.prodentisId\)/);
    });
});

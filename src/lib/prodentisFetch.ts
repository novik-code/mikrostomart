/**
 * JEDYNY punkt wyjścia do API Prodentisa.
 * ──────────────────────────────────────────────────────────────────────────────
 * 🔑 Po co powstał w tej postaci (2026-09-04). Audyt dostawcy PMS wykazał, że jego trasy
 * ODCZYTU są publiczne — bez klucza, z PESEL-ami i notatkami klinicznymi. Zamknięcia nie dało
 * się zaplanować, dopóki nie wiedzieliśmy, co się przez to złamie. Zmierzone u nas:
 * **86 wywołań PMS, 59 BEZ klucza** (prawie wyłącznie odczyty). Przyczyną nie była decyzja,
 * tylko brak jednego miejsca: poprzednia wersja tego pliku przekazywała `options` w całości
 * dalej i nagłówka NIE dotykała, więc klucz doklejał ten, kto pamiętał.
 *
 * 🪤 TRZY PUŁAPKI, które ten plik zamyka — każda była realna, nie teoretyczna:
 *
 * 1. **Pusty nagłówek zamiast klucza.** Wołający robili `(await getProdentisKey()) ?? ''`
 *    (16 wystąpień w 15 plikach). Przy pustej bazie i braku zmiennej środowiskowej leciał
 *    `X-API-Key:` o pustej wartości — czyli „klucz jest w kodzie" przy „klucza nie ma
 *    w żądaniu". Tutaj brak klucza jest TWARDYM błędem: lepiej głośna awaria jednej trasy
 *    niż cicha utrata uwierzytelnienia na wszystkich.
 *
 * 2. **Ścieżka zapasowa na surowy adres IP.** Poprzednia wersja po błędzie tunelu szła na
 *    `http://83.230.40.14:3000` — zwykłym HTTP. Po dołożeniu klucza oznaczałoby to wysyłanie
 *    poświadczenia OTWARTYM TEKSTEM. Fallbacku nie ma i nie wolno go przywracać: tunel jest
 *    jedyną drogą, a jego awaria ma być widoczna, nie obchodzona.
 *
 * 3. **Ciało błędu kasowane po drodze.** Trasy pośredniczące oddawały własny komunikat zamiast
 *    tego z PMS, więc uzgodniona taksonomia (`SLOT_NOT_ALIGNED`, `DOCTOR_ON_LEAVE`, …) nigdy
 *    by do nas nie dojechała. `pmsError()` niżej wyciąga pole `error` w niezmienionej postaci.
 *
 * ⚪ Świadomie BEZ ponawiania: PMS stoi na jednym serwerze w gabinecie, a większość naszych
 * wywołań siedzi w ścieżce żądania pacjenta. Ponowienie zamienia jedną wolną odpowiedź w dwie.
 */

import { getPMSConfig } from './pmsConfig';
import { isDemoMode } from './demoMode';

/** Domyślny limit czasu. Krótszy niż limit funkcji na Vercelu, żeby zdążyć oddać własny błąd. */
const DOMYSLNY_TIMEOUT_MS = 8000;

/**
 * Rzucane w trybie demo. 🔴 Zmierzone 2026-09-04: **42 z 59 plików** wołających Prodentisa
 * nie miało żadnej bramki demo, więc podglądy Vercela i wdrożenie demonstracyjne uderzały
 * w PRODUKCYJNY PMS produkcyjnym kluczem — czyli nasze testy dotykały żywego grafiku gabinetu.
 * 🔑 Bramka stoi TUTAJ, bo po migracji jest to jedyne wyjście do PMS: jedno miejsce zamyka
 * wszystkie 42 naraz, zamiast 42 osobnych warunków, z których któryś i tak by wypadł.
 */
export class TrybDemoBezPMS extends Error {
    constructor(path: string) {
        super(`Tryb demo: żądanie do PMS (${path}) zostało zablokowane. Demo nie rozmawia z produkcyjnym Prodentisem.`);
        this.name = 'TrybDemoBezPMS';
    }
}

/** Rzucane, gdy nie mamy czym się uwierzytelnić. Wołający ma to zamienić na 500, nie na pustkę. */
export class BrakKluczaPMS extends Error {
    constructor() {
        super(
            'Brak klucza API do Prodentisa (ani w clinic_settings.pms_settings, ani w PRODENTIS_API_KEY). ' +
                'Żądanie NIE zostało wysłane — pusty nagłówek uwierzytelnienia jest gorszy niż jawna awaria.',
        );
        this.name = 'BrakKluczaPMS';
    }
}

export interface OpcjePMS extends Omit<RequestInit, 'signal'> {
    /** Limit czasu w ms (domyślnie 8000). */
    timeoutMs?: number;
    /** Własny sygnał przerwania — ma pierwszeństwo przed `timeoutMs`. */
    signal?: AbortSignal;
    /**
     * Ścieżki jawnie publiczne po stronie PMS, gdzie klucz nie jest potrzebny.
     * ⚠️ Używać WYŁĄCZNIE tam, gdzie brak klucza jest decyzją, nie przeoczeniem —
     * i zawsze z komentarzem przy wywołaniu.
     */
    bezKlucza?: boolean;
    /**
     * Której klasy poświadczeń użyć. Domyślnie `pacjent` — bo tak wygląda większość ruchu
     * i bo pomyłka w tę stronę jest nieszkodliwa (klucz pacjencki i tak przechodzi walidację).
     *
     * 🔑 `personel` dla operacji recepcji i panelu admina. Sens jest w NIEZALEŻNYM
     * UNIEWAŻNIENIU: wyciek jednego klucza nie kładzie drugiej powierzchni.
     * 🪤 Dopóki drugi klucz nie jest wpisany, `personel` dostaje klucz pacjencki — czyli
     * zachowanie sprzed zmiany. Mechanizm wchodzi bez czekania na wartość od gabinetu.
     */
    klucz?: 'pacjent' | 'personel';
}

/**
 * Wykonuje żądanie do PMS: adres z konfiguracji (tunel), klucz wstrzyknięty, limit czasu.
 *
 * @param path ścieżka zaczynająca się od `/`, np. `/api/doctors`
 */
export async function prodentisFetch(path: string, options: OpcjePMS = {}): Promise<Response> {
    if (isDemoMode) throw new TrybDemoBezPMS(path);

    const { timeoutMs, signal, bezKlucza, headers, klucz, ...reszta } = options;
    const konfiguracja = await getPMSConfig();
    const { apiUrl } = konfiguracja;
    // 🪤 Zejście na klucz pacjencki, gdy drugiego jeszcze nie ma — patrz `OpcjePMS.klucz`.
    const apiKey = klucz === 'personel'
        ? (konfiguracja.apiKeyStaff || konfiguracja.apiKey)
        : konfiguracja.apiKey;

    if (!bezKlucza && !apiKey) throw new BrakKluczaPMS();

    const naglowki = new Headers(headers);
    if (!naglowki.has('Content-Type') && reszta.body) naglowki.set('Content-Type', 'application/json');
    // 🔑 Klucz ustawiamy TUTAJ i nigdzie indziej. Wołający nie ma powodu go znać.
    if (apiKey && !bezKlucza) naglowki.set('X-API-Key', apiKey);

    const odpowiedz = await fetch(`${apiUrl}${path}`, {
        ...reszta,
        headers: naglowki,
        signal: signal ?? AbortSignal.timeout(timeoutMs ?? DOMYSLNY_TIMEOUT_MS),
        cache: 'no-store',
    });

    // 🔴 ODMOWA KLUCZA MA KRZYCZEĆ, BRAK DANYCH MA MILCZEĆ.
    // Dostawca lada moment wymusi klucz na ODCZYTACH (dziś przechodzą bez niego). Gdyby nasz
    // klucz okazał się zły albo nieobecny, 85 wywołujących potraktowałoby 401 dokładnie tak samo
    // jak „PMS nie odpowiada" i — gorzej — jak „nie ma danych": `if (!res.ok) return null`.
    // Strona kliniki serwowałaby wtedy zaszyte liczby ze statusem 200 i bez jednego błędu w logu.
    // To ta sama rodzina, która już raz kosztowała nas miesiące ciszy: jeden kod na dwie przyczyny.
    // Alarm stoi TUTAJ, bo to jedyny punkt wspólny wszystkich wywołań — nie da się go przeoczyć
    // w nowej trasie, tak jak nie da się przeoczyć wstrzyknięcia klucza.
    if (odpowiedz.status === 401 || odpowiedz.status === 403) {
        console.error(
            `${ZNACZNIK_ODMOWY} PMS odrzucił nasze poświadczenie: ${odpowiedz.status} na ${path}.`
            + ` Klucz ${apiKey ? `obecny (${apiKey.length} zn.)` : 'NIEOBECNY'};`
            + ` nagłówek ${bezKlucza ? 'świadomie pominięty' : 'wysłany'}.`
            + ' To NIE jest brak danych ani awaria sieci — to odmowa uwierzytelnienia.',
        );
    }

    return odpowiedz;
}

/**
 * Znacznik do grepowania w logach Vercela i do alarmu. Trzymamy go w JEDNYM miejscu,
 * żeby dało się go szukać bez zgadywania brzmienia komunikatu.
 */
export const ZNACZNIK_ODMOWY = '[PMS-ODMOWA-KLUCZA]';

/**
 * Czy ta odpowiedź to odmowa uwierzytelnienia, a nie brak danych?
 *
 * 🔑 Po co osobna funkcja: wołający, który robi `if (!res.ok) return null`, zamienia odmowę
 * klucza w „nie ma danych". Kto chce się zachować inaczej przy odmowie niż przy pustce,
 * pyta TĄ funkcją, zamiast rozsiewać po repo magiczne `401`.
 */
export function czyOdmowaKlucza(res: Response): boolean {
    return res.status === 401 || res.status === 403;
}

/**
 * Kod błędu z odpowiedzi PMS — w NIEZMIENIONEJ postaci.
 *
 * 🔑 Dostawca uzgodnił z nami taksonomię (`SLOT_NOT_ALIGNED`, `DURATION_TOO_SHORT`,
 * `OUTSIDE_WORKING_HOURS`, `DOCTOR_ON_LEAVE`, `DATE_OUT_OF_RANGE`) i prosił, żebyśmy
 * rozpoznawali po polu `error`, NIE po treści `message`. Zwracamy więc `error` bez tłumaczenia —
 * podmiana na własny komunikat po drodze była powodem, dla którego ta taksonomia dotąd
 * nie miała jak do nas dojechać.
 */
export async function pmsError(res: Response): Promise<{ error: string | null; message: string | null }> {
    try {
        const data = await res.clone().json();
        return {
            error: typeof data?.error === 'string' ? data.error : null,
            message: typeof data?.message === 'string' ? data.message : null,
        };
    } catch {
        return { error: null, message: null };
    }
}

/** Adres bazowy PMS (tunel). Do miejsc, które budują URL same — np. przekierowania. */
export async function getProdentisUrl(): Promise<string> {
    return (await getPMSConfig()).apiUrl;
}

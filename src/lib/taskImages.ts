/**
 * Zdjęcia zadań personelu — JEDNO miejsce, przez które wchodzą i wychodzą.
 *
 * 🔴 PO CO TEN MODUŁ POWSTAŁ. Migracja 192 dała kolumny `image_paths`/`image_path`
 * i nauczyła ZAPISU wyliczać klucze, ale ODCZYT został nietknięty: `/api/employee/tasks`
 * oddawał surowe `image_urls` z bazy, czyli adresy PUBLICZNE. Zamknięcie bucketa
 * `task-images` (migracja 194) zgasiłoby przez to zdjęcia u obu klientów naraz:
 *   • apka 1.2.0 ze sklepu — `lib/tasks.ts:187` `taskPhotos` renderuje `image_url` + `image_urls`,
 *     a `lib/api.ts:1216` typuje odpowiedź uploadu jako `{ url }` i pola `path` NIE ZNA;
 *   • panel webowy — `TasksTab.tsx:1921` i `:2251` wkładają te adresy prosto w `<img src>`.
 * (Zapis „panel webowy przeszedł na klucze" był nieścisły: web WYSYŁA `image_paths`,
 *  ale CZYTA adresy dokładnie jak apka. Naprawa odczytu obsługuje więc oba klienty naraz.)
 *
 * 🪤 DRUGA POŁOWA TEJ SAMEJ ZMIANY, bez której pierwsza szkodzi. Klient odsyła nam
 * z powrotem to, co dostał (apka: `(staff)/zadania/nowe.tsx` → `image_urls`). Gdyby odczyt
 * zaczął oddawać podpisy, a zapis brał je dosłownie, do `employee_tasks` trafiłyby adresy
 * z tokenem: martwe po 15 minutach, a przy okazji `task_history` notowałoby „zmianę
 * zdjęcia" przy KAŻDYM zapisie (diff porównuje stringi — `tasks/[id]/route.ts:198`).
 * Dlatego zapis normalizuje wejście do postaci kanonicznej ZANIM cokolwiek zobaczy bazę.
 *
 * Kontrakt pól zostaje bez zmian — `image_url`/`image_urls` to nadal ADRESY DO OTWARCIA.
 * Zmienia się wyłącznie ich wartość, tak samo jak zrobiono to dla dokumentów pacjenta
 * (migracja 193). Żaden klient nie wymaga przez to nowej binarki.
 */

/** Kształt wiersza, który nas interesuje. Reszta kolumn przechodzi nietknięta. */
type WierszZeZdjeciami = {
    image_url?: string | null;
    image_urls?: string[] | null;
    image_path?: string | null;
    image_paths?: string[] | null;
};

/**
 * Porty do Storage — wstrzykiwane, żeby dało się je przetestować WYKONANIEM.
 *
 * Wzorzec z `consentTypes.wybierzAdresSzablonu`: strażnik czytający treść pliku
 * przepuścił w tym repo cztery regresje w bliźniaczej ścieżce (`if (false && …)`
 * zostawia szukane słowa na miejscu). Zachowanie sprawdzamy na atrapach.
 */
export type PortyZdjec = {
    podpisz?: (paths: string[]) => Promise<Map<string, string>>;
    rozwiazKlucze?: (urls: string[]) => Promise<Array<string | null> | null>;
    /** Może być synchroniczny — wołający i tak czeka na wynik. */
    adresPubliczny?: (path: string) => string | Promise<string>;
};

/**
 * 🪤 Import DYNAMICZNY, wzorem `consentTypes.ts`. `privateStorage` tworzy klienta Supabase
 * na poziomie modułu i przy statycznym imporcie wywraca każdy test już na wczytaniu pliku
 * („supabaseUrl is required"). Ładujemy go dopiero wtedy, gdy naprawdę idziemy do Storage.
 */
const DOMYSLNE: Required<PortyZdjec> = {
    podpisz: async paths => {
        const { signObjects, TASK_IMAGE_BUCKET } = await import('@/lib/privateStorage');
        return signObjects(TASK_IMAGE_BUCKET, paths);
    },
    rozwiazKlucze: async urls => {
        const { resolveObjectPaths, TASK_IMAGE_BUCKET } = await import('@/lib/privateStorage');
        return resolveObjectPaths(urls, TASK_IMAGE_BUCKET);
    },
    adresPubliczny: async path => {
        const { publicUrlFor, TASK_IMAGE_BUCKET } = await import('@/lib/privateStorage');
        return publicUrlFor(TASK_IMAGE_BUCKET, path);
    },
};

/** Klucze wiersza w kolejności, w jakiej mają wrócić do klienta. */
function kluczeWiersza(t: WierszZeZdjeciami): string[] {
    const lista = Array.isArray(t.image_paths) ? t.image_paths : [];
    return lista.map(p => (p || '').trim()).filter(Boolean);
}

/**
 * Podmienia adresy zdjęć na PODPISANE — dla listy zadań i dla pojedynczego wiersza.
 *
 * Zasada jest ta sama co w `documentSource`: **klucz wygrywa, legacy adres to fallback**.
 * Wiersz bez `image_paths` (zapisany starym kodem po backfillu) dostaje swoje stare
 * `image_urls` bez zmian — dopóki bucket jest publiczny, otworzy się; po zamknięciu
 * lekiem jest PONOWNE uruchomienie `storage_backfill_apply()`, nie parser adresu w TS.
 *
 * 🔑 Kolejność bierzemy z `image_paths`, nie z `image_urls`. Backfill zapisał klucze
 * „w kolejności jak image_urls, BEZ pustych wpisów" (migracja 192 miała 3 puste stringi
 * w danych), więc indeksy obu tablic nie muszą się pokrywać i mapowanie 1:1 po pozycji
 * potrafiłoby podstawić pod zdjęcie A adres zdjęcia B.
 *
 * Podpis, którego nie udało się wystawić, NIE trafia do wyniku — pozycja znika z listy
 * zamiast zostać `undefined` udającym adres.
 */
export async function withSignedTaskImages<T extends WierszZeZdjeciami>(
    tasks: T[],
    porty: PortyZdjec = {},
): Promise<T[]> {
    if (!tasks.length) return tasks;
    const { podpisz } = { ...DOMYSLNE, ...porty };

    const wszystkie = tasks.flatMap(kluczeWiersza);
    const pojedyncze = tasks
        .map(t => (t.image_path || '').trim())
        .filter(Boolean);

    const podpisy = await podpisz([...wszystkie, ...pojedyncze]);
    if (!podpisy.size) return tasks;

    return tasks.map(t => {
        const klucze = kluczeWiersza(t);
        const wynik: T = { ...t };

        if (klucze.length) {
            const podpisane = klucze.map(k => podpisy.get(k)).filter((u): u is string => !!u);
            // Zero podpisów przy niepustych kluczach = awaria Storage. Zostawiamy stare
            // adresy — gorzej byłoby oddać pustą galerię, która wygląda jak skasowane zdjęcia.
            if (podpisane.length) wynik.image_urls = podpisane;
        }

        const jeden = (t.image_path || '').trim();
        if (jeden) {
            const podpisany = podpisy.get(jeden);
            if (podpisany) wynik.image_url = podpisany;
        }

        return wynik;
    });
}

/**
 * Wejście od klienta → wartości gotowe do zapisu w bazie.
 *
 * Zwraca WYŁĄCZNIE pola, które realnie ma nadpisać. Wołający wstrzykuje je do `body`
 * ZANIM zbuduje `updates` i policzy diff — inaczej historia porówna token z adresem
 * i zapisze zmianę, której nie było.
 *
 * Gdy `resolve_object_paths` nie odpowie (RPC padło, migracji jeszcze nie ma), zwracamy
 * pusty obiekt: zapis zachowuje się DOKŁADNIE jak przed tą zmianą. Zgadywanie klucza
 * parserem w TS byłoby drugą implementacją reguły, która ma żyć wyłącznie w SQL.
 */
export async function normalizedTaskImageFields(
    body: { image_url?: unknown; image_urls?: unknown },
    porty: PortyZdjec = {},
): Promise<{
    image_url?: string | null;
    image_urls?: string[];
    image_path?: string | null;
    image_paths?: string[];
}> {
    const { rozwiazKlucze, adresPubliczny } = { ...DOMYSLNE, ...porty };
    const out: {
        image_url?: string | null;
        image_urls?: string[];
        image_path?: string | null;
        image_paths?: string[];
    } = {};

    if ('image_urls' in body) {
        const wejscie = Array.isArray(body.image_urls)
            ? (body.image_urls as unknown[]).map(u => (typeof u === 'string' ? u : ''))
            : [];
        const sciezki = await rozwiazKlucze(wejscie);
        if (sciezki) {
            const klucze = sciezki.filter((p): p is string => !!p);
            out.image_paths = klucze;
            out.image_urls = await Promise.all(klucze.map(k => adresPubliczny(k)));
        }
    }

    if ('image_url' in body) {
        const surowy = typeof body.image_url === 'string' ? body.image_url.trim() : '';
        if (!surowy) {
            out.image_url = null;
            out.image_path = null;
        } else {
            const sciezki = await rozwiazKlucze([surowy]);
            if (sciezki) {
                const klucz = sciezki[0] ?? null;
                out.image_path = klucz;
                // Adres nierozpoznany jako obiekt bucketa zostaje taki, jaki przyszedł.
                out.image_url = klucz ? await adresPubliczny(klucz) : surowy;
            }
        }
    }

    return out;
}

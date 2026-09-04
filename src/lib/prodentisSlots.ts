/**
 * Odczyt wolnych terminów z Prodentisa — wspólny dla asystenta AI (ręcznego i cronowego).
 *
 * 🔴 Powód powstania (2026-09-04). Oba miejsca czytały odpowiedź tak:
 *
 *     const slotsData = await slotsRes.json();
 *     if (slotsData.slots && slotsData.slots.length > 0) { … }
 *
 * a `GET /api/slots/free` oddaje **gołą tablicę**, nie obiekt z polem `slots`. Warunek był
 * więc zawsze fałszywy i gałąź proponująca pacjentowi wolne terminy **nigdy się nie wykonała**.
 * Bez śladu w logach — formalnie nic się nie psuło, po prostu asystent nigdy nie podawał godzin.
 *
 * 🪤 Pod spodem czekał DRUGI błąd, który ujawniłby się dopiero po naprawie pierwszego:
 * `slot.time || slot.startTime` — API nie zwraca żadnego z tych pól. Godzina jest w `start`
 * (ISO bez przesunięcia). Naprawa samego kształtu koperty dałaby listę `undefined`
 * wysyłaną pacjentowi w mailu.
 *
 * 🔑 Czytamy OBA kształty świadomie: dziś tablicę, a po wdrożeniu `meta=1` u dostawcy PMS —
 * obiekt `{ slots: [...] }`. Dzięki temu przełączenie na `meta=1` nie wymaga zmiany w tym pliku.
 */

export interface WolnySlot {
    doctor?: string;
    doctorName?: string;
    /** Czas ŚCIENNY gabinetu, ISO bez przesunięcia: „2026-10-12T10:00:00". */
    start: string;
    end?: string;
}

/** Przyjmuje gołą tablicę (dziś) albo kopertę `{ slots: [...] }` (po `meta=1`). */
export function odczytajSloty(payload: unknown): WolnySlot[] {
    const surowe: unknown = Array.isArray(payload)
        ? payload
        : (payload && typeof payload === 'object' && Array.isArray((payload as { slots?: unknown }).slots))
            ? (payload as { slots: unknown[] }).slots
            : null;

    if (!Array.isArray(surowe)) return [];

    return surowe.filter((s): s is WolnySlot =>
        !!s && typeof s === 'object' && typeof (s as WolnySlot).start === 'string' && (s as WolnySlot).start.length >= 16
    );
}

/**
 * Godzina „HH:MM" wycięta ze STRINGA, nie przez `new Date()`.
 * 🪤 Prodentis oddaje czas ścienny gabinetu bez przesunięcia, a nasze serwery chodzą w UTC —
 * przepuszczenie tego przez `Date` i formatowanie ze strefą przesunęłoby godziny o 1–2 h,
 * i to tylko w części roku. Cięcie stringa jest odporne na zmianę czasu.
 */
export function godzinaSlotu(slot: WolnySlot): string {
    return slot.start.slice(11, 16);
}

/**
 * Podsumowanie dnia dla promptu asystenta: po jednej linii na lekarza.
 * Zwraca pusty string, gdy nie ma czego pokazać — wołający ma wtedy pominąć dzień.
 */
export function podsumujDzienPoLekarzach(sloty: WolnySlot[], maxNaLekarza = 5): string {
    if (sloty.length === 0) return '';

    const wgLekarza = new Map<string, string[]>();
    for (const s of sloty) {
        const lekarz = s.doctorName || 'Nieprzypisany';
        if (!wgLekarza.has(lekarz)) wgLekarza.set(lekarz, []);
        wgLekarza.get(lekarz)!.push(godzinaSlotu(s));
    }

    return [...wgLekarza.entries()]
        .map(([lekarz, godziny]) => {
            const pokazane = godziny.slice(0, maxNaLekarza).join(', ');
            const reszta = godziny.length > maxNaLekarza ? ` (+${godziny.length - maxNaLekarza} więcej)` : '';
            return `  - ${lekarz}: ${pokazane}${reszta}`;
        })
        .join('\n');
}

/**
 * Kontekst wolnych terminów dla asystenta AI — z odpowiedzi `days=N&meta=1`.
 *
 * 🔑 Po co statusy w prompcie: pacjent pisze „kiedy się dostanę?". Bez statusów asystent
 * widział dla zapełnionego dnia pustkę i po prostu go pomijał — czyli milczał tam, gdzie
 * uczciwa odpowiedź brzmi „tego dnia komplet, najbliższy wolny termin 11 września".
 *
 * 🪤 Reguła nadrzędna, wprost w treści przekazywanej modelowi: gdy statusu NIE ZNAMY,
 * asystent ma NIE twierdzić, że terminów nie ma. To zdanie trafia do maila wysyłanego
 * pacjentowi, więc „nie wiem" musi wygrywać z gładkim „niestety brak".
 */
export function zbudujKontekstTerminow(
    payload: unknown,
    nazwaDnia: (data: string) => string,
): string {
    const koperta = payload as { days?: Array<{ date: string; doctors?: Array<{ doctorName?: string; status?: string; reason?: string | null; nextAvailable?: string | null }>; slots?: unknown }> };
    const dni = Array.isArray(koperta?.days) ? koperta.days : [];
    if (dni.length === 0) return '';

    const linie: string[] = [];
    for (const dzien of dni) {
        if (!dzien?.date) continue;
        const sloty = odczytajSloty(dzien.slots);
        const podsumowanie = podsumujDzienPoLekarzach(sloty);
        if (podsumowanie) {
            linie.push(`${nazwaDnia(dzien.date)}:\n${podsumowanie}`);
            continue;
        }

        const operatorzy = dzien.doctors || [];
        const znane = ['available', 'fully_booked', 'not_bookable_online', 'not_working'];
        const niepewny = operatorzy.length === 0 || operatorzy.some(o => !znane.includes(o.status ?? ''));
        if (niepewny) {
            linie.push(`${nazwaDnia(dzien.date)}: BRAK PEWNEJ INFORMACJI — nie twierdź, że nie ma terminów; zaproponuj kontakt telefoniczny.`);
            continue;
        }

        const najblizszy = operatorzy.map(o => o.nextAvailable).filter((d): d is string => !!d).sort()[0];
        if (operatorzy.some(o => o.reason === 'same_day_not_bookable')) {
            // 🔴 `reason` bije `status`: PMS raportuje `fully_booked`, ale to NIE komplet zapisów.
            // Model NIE MOŻE napisać pacjentowi „brak wolnych terminów" — patrz `statusOperatora`.
            linie.push(`${nazwaDnia(dzien.date)}: na ten dzień gabinet NIE prowadzi rezerwacji online (to NIE znaczy, że nie ma wolnych godzin) — zaproponuj kontakt telefoniczny z rejestracją${najblizszy ? `; najbliższy termin do umówienia online: ${najblizszy}` : ''}.`);
        } else if (operatorzy.some(o => o.status === 'fully_booked')) {
            linie.push(`${nazwaDnia(dzien.date)}: wszystkie terminy zajęte${najblizszy ? `, najbliższy wolny: ${najblizszy}` : ''}.`);
        } else if (operatorzy.some(o => o.status === 'not_bookable_online')) {
            linie.push(`${nazwaDnia(dzien.date)}: terminów na ten dzień nie umawiamy online — potrzebny telefon do rejestracji.`);
        } else if (operatorzy.some(o => o.status === 'available')) {
            // Specjalista przyjmuje, a lista jest pusta po NASZYCH filtrach (:00/:30, minimalne
            // wyprzedzenie). Model NIE MOŻE z tego zrobić „gabinet nie przyjmuje" — patrz
            // bliźniacza gałąź w `podsumujDzienOperatorow`.
            linie.push(`${nazwaDnia(dzien.date)}: specjalista przyjmuje, ale nie mamy godzin do zaproponowania online — zaproponuj kontakt telefoniczny${najblizszy ? `; najbliższy wolny termin: ${najblizszy}` : ''}.`);
        } else {
            linie.push(`${nazwaDnia(dzien.date)}: gabinet nie przyjmuje${najblizszy ? `, najbliższy wolny termin: ${najblizszy}` : ''}.`);
        }
    }
    return linie.join('\n');
}

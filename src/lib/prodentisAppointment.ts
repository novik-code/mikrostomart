/**
 * Odświeżenie stanu wizyty w Prodentisie PRZED operacją zapisu (punkt 3h uzgodnień z PMS).
 *
 * 🔴 Po co. Zapamiętany u nas `prodentis_id` bywa nieaktualny, a dowiadywaliśmy się o tym
 * dopiero z błędu operacji zapisu. Dostawca PMS zalecał to dwukrotnie (13.05 i ponownie
 * w rundzie 4) — u nas nigdy nie zostało wdrożone: trzy ścieżki zapisu (odwołanie, przełożenie,
 * potwierdzenie obecności) czytały zapamiętany identyfikator niezależnie od siebie.
 *
 * Skala, zmierzona przez dostawcę na naszych 50 rezerwacjach:
 *   · **14 z 50 (28 %)** stoi w grafiku u INNEGO lekarza, niż wysłaliśmy — zmiana lekarza
 *     jest w Prodentisie wykonywana W MIEJSCU, na tym samym rekordzie;
 *   · zmiana TERMINU tworzy natomiast NOWY rekord z nowym identyfikatorem — stąd nasze 404.
 * Znaleziony przy okazji przykład na żywo: wizyta `0100234418` ma u nas w bazie `11.09 14:30`,
 * a w Prodentisie **16:30**. Bez odświeżenia potwierdzenie dla pacjenta podałoby złą godzinę.
 *
 * 🪤 NAJWAŻNIEJSZA REGUŁA TEGO PLIKU: awaria łączności NIE jest „wizyty nie ma".
 * `unavailable` znaczy „nie wiemy" i wołający ma wtedy działać jak dotąd (na zapamiętanym
 * identyfikatorze), a nie ogłaszać pacjentowi, że wizyta zniknęła. To ta sama rodzina błędu,
 * którą naprawialiśmy w kalendarzu: jeden widok na dwie różne przyczyny.
 */

import { prodentisFetch } from '@/lib/prodentisFetch';

export interface WizytaPMS {
    id: string;
    patientId: string;
    doctorId: string;
    doctorName: string;
    /** „2026-09-11" */
    date: string;
    /** „16:30" */
    startTime: string;
    endTime: string;
    duration: number;
    status: string;
    cancelDate: string | null;
}

export type StanWizyty =
    | { ok: true; wizyta: WizytaPMS }
    /** 404 — identyfikator nieaktualny (najczęściej: wizytę przełożono, powstał nowy rekord). */
    | { ok: false; powod: 'not_found' }
    /** Wizyta istnieje, ale jest skreślona. */
    | { ok: false; powod: 'cancelled'; wizyta: WizytaPMS }
    /** Nie udało się zapytać — awaria, timeout, brak konfiguracji. NIE znaczy „nie ma". */
    | { ok: false; powod: 'unavailable' };

/**
 * @param prodentisId identyfikator zapamiętany u nas
 * @param _apiKey     ⚠️ PRZESTARZAŁY, ignorowany. Klucz wstrzykuje `prodentisFetch` i tylko on;
 *                    parametr został wyłącznie po to, żeby nie łamać istniejących wywołań.
 *                    Brak klucza to dziś `BrakKluczaPMS` — łapie go `catch` niżej jako
 *                    `unavailable`, czyli „nie wiemy", zgodnie z regułą tego pliku.
 */
export async function odswiezWizyte(
    prodentisId: string | null | undefined,
): Promise<StanWizyty> {
    if (!prodentisId) return { ok: false, powod: 'unavailable' };

    try {
        const res = await prodentisFetch(`/api/schedule/appointment/${prodentisId}`, {
            timeoutMs: 10_000,
        });

        if (res.status === 404) return { ok: false, powod: 'not_found' };
        if (!res.ok) return { ok: false, powod: 'unavailable' };

        const wizyta = (await res.json()) as WizytaPMS;
        if (!wizyta?.id) return { ok: false, powod: 'unavailable' };

        // 🔑 Skreślona wizyta wraca ze statusem 200 — samo `res.ok` nie wystarcza.
        if (wizyta.status === 'cancelled' || wizyta.cancelDate) {
            return { ok: false, powod: 'cancelled', wizyta };
        }
        return { ok: true, wizyta };
    } catch {
        // Timeout, zerwana sieć, zły JSON — wszystko to znaczy „nie wiemy", nie „nie ma".
        return { ok: false, powod: 'unavailable' };
    }
}

/** Czy stan zapamiętany u nas rozjechał się z tym, co stoi w Prodentisie. */
export function rozjazdWizyty(
    wizyta: WizytaPMS,
    zapamietane: { date?: string | null; time?: string | null; doctorProdentisId?: string | null },
): string[] {
    const roznice: string[] = [];
    if (zapamietane.date && zapamietane.date !== wizyta.date) {
        roznice.push(`data: u nas ${zapamietane.date}, w PMS ${wizyta.date}`);
    }
    const czas = (zapamietane.time || '').slice(0, 5);
    if (czas && czas !== wizyta.startTime) {
        roznice.push(`godzina: u nas ${czas}, w PMS ${wizyta.startTime}`);
    }
    if (zapamietane.doctorProdentisId && zapamietane.doctorProdentisId !== wizyta.doctorId) {
        roznice.push(`lekarz: u nas ${zapamietane.doctorProdentisId}, w PMS ${wizyta.doctorId}`);
    }
    return roznice;
}


// ─────────────────────────────────────────────────────────────────────────────
// WŁASNOŚĆ WIZYTY (P-001, 2026-09-05)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 🔴 PO CO TO ISTNIEJE. Do 05.09 żadna z dziewięciu tras w `api/patients/appointments`
 * nie porównała ani razu `wizyta.patientId` z `payload.prodentisId` (`grep patientId`
 * po całym katalogu → ZERO trafień). Własność sprawdzano wyłącznie wobec NASZEGO wiersza
 * w `appointment_actions`, a ten wiersz powstawał z identyfikatora podanego przez klienta.
 * Skutek: zalogowany pacjent, który znał (albo zgadł — identyfikatory są sekwencyjne)
 * numer cudzej wizyty, mógł ją skreślić, przełożyć albo oznaczyć jako potwierdzoną.
 * Klucz do PMS jest gabinetowy, więc Prodentis takiej operacji nie odrzuci.
 *
 * 🔑 POMIAR NA PRODUKCJI (05.09), bez którego to była zgadywanka:
 *   · `GET /api/schedule/appointment/:id` oddaje `patientId` jako **string 10 cyfr
 *     z zerami wiodącymi** (`"0100001110"`); cztery różne wizyty dały cztery różne id;
 *   · `patients.prodentis_id` u nas: **149 z 149** kont ma dokładnie ten sam kształt.
 * Formaty są więc zgodne i porównanie jest bezpieczne.
 */

/** Zera wiodące i typ liczbowy nie mogą decydować o tym, czy pacjent odwoła swoją wizytę. */
function normalizujId(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;
    const bezZer = s.replace(/^0+/, '');
    return bezZer || '0';
}

/**
 * Czy ta wizyta w PMS należy do tego pacjenta.
 *
 * 🪤 FAIL-OPEN PRZY BRAKU POLA — świadomie. Gdyby dostawca PMS przestał kiedyś oddawać
 * `patientId`, bramka odcięłaby WSZYSTKICH pacjentów od odwoływania własnych wizyt.
 * Brak pola znaczy „nie wiemy", a niewiedzy nie zamieniamy w oskarżenie — to ta sama
 * reguła, która rządzi `unavailable` w tym pliku. Zawężenie ryzyka: piętro A (weryfikacja
 * identyfikatora wobec listy wizyt pacjenta) działa niezależnie i nie opiera się na tym polu.
 */
export function wizytaNalezyDoPacjenta(
    wizyta: Pick<WizytaPMS, 'patientId'>,
    prodentisId: string | null | undefined,
): boolean {
    const wPms = normalizujId(wizyta?.patientId);
    if (wPms === null) return true; // brak pola = nie wiemy, nie blokujemy
    const nasz = normalizujId(prodentisId);
    if (nasz === null) return false; // my nie wiemy, kim jest wołający — to już powód do odmowy
    return wPms === nasz;
}

export interface PozycjaListyWizyt {
    id: string;
    /** ISO prosto z PMS — przekazywać DOSŁOWNIE, nigdy nie odtwarzać. */
    date: string;
    duration: number;
    doctor?: { id?: string; name?: string };
}

export type ListaWizyt =
    | { ok: true; lista: PozycjaListyWizyt[] }
    /** Nie udało się zapytać. NIE znaczy „pacjent nie ma wizyt". */
    | { ok: false; powod: 'unavailable' };

/**
 * Wizyty PACJENTA prosto z PMS — ta sama trasa, z której korzysta
 * `GET /api/patients/upcoming-appointments`.
 *
 * 🔑 Własność wynika tu z KONSTRUKCJI adresu: `prodentisId` pochodzi z podpisanego tokenu,
 * więc lista z definicji zawiera wyłącznie wizyty tego pacjenta. Dlatego sprawdzenie
 * „czy podany identyfikator jest na tej liście" jest mocniejsze od porównywania pól.
 *
 * 🪤 `days=365`, nie 180 jak w `upcoming-appointments`: tamta trasa ogranicza WIDOK,
 * a ta ma rozstrzygać WŁASNOŚĆ — wizyta spoza okna widoku nadal jest wizytą pacjenta.
 * Zmierzone na produkcji 05.09: PMS przyjmuje `days=365` (i 400) z HTTP 200.
 */
export async function listaWizytPacjenta(prodentisId: string | null | undefined): Promise<ListaWizyt> {
    if (!prodentisId) return { ok: false, powod: 'unavailable' };
    try {
        const res = await prodentisFetch(`/api/patient/${encodeURIComponent(prodentisId)}/future-appointments?days=365`, {
            timeoutMs: 10_000,
        });
        if (!res.ok) return { ok: false, powod: 'unavailable' };
        const dane = await res.json();
        const lista = Array.isArray(dane?.appointments) ? dane.appointments : Array.isArray(dane) ? dane : null;
        // 🪤 Pusta lista to prawidłowa odpowiedź („pacjent nie ma przyszłych wizyt”).
        // Brak TABLICY to co innego — zły kształt odpowiedzi znaczy „nie wiemy”.
        if (!lista) return { ok: false, powod: 'unavailable' };
        return { ok: true, lista: lista as PozycjaListyWizyt[] };
    } catch {
        return { ok: false, powod: 'unavailable' };
    }
}

/** Pozycja o tym identyfikatorze z listy pacjenta albo `null`. Porównanie odporne na zera wiodące. */
export function znajdzWizyteNaLiscie(
    lista: PozycjaListyWizyt[],
    scheduleId: string | null | undefined,
): PozycjaListyWizyt | null {
    const szukane = normalizujId(scheduleId);
    if (szukane === null) return null;
    return lista.find((w) => normalizujId(w?.id) === szukane) ?? null;
}


/**
 * Czy wolno wykonać operację ZAPISU na tej wizycie — jedno rozstrzygnięcie dla wszystkich
 * trzech ścieżek (odwołanie, przełożenie, potwierdzenie obecności).
 *
 * 🔴 DLACZEGO NIE WYSTARCZA `stanWizyty.ok && wizytaNalezyDoPacjenta(...)`.
 * Pierwsza wersja bramki P-001 miała dokładnie taki kształt i sceptyk audytu obalił ją
 * WYKONANIEM. Przy awarii CZĄSTKOWEJ PMS-u — odczyt `/api/schedule/appointment/:id` pada
 * (czyli `unavailable`), a zapisy `DELETE`/`PUT`/`icon` działają — warunek `stanWizyty.ok`
 * jest fałszywy, więc sprawdzenie własności zostaje POMINIĘTE i wykonanie idzie prosto
 * do skreślenia CUDZEJ wizyty. Zmierzone: HTTP 200 + `DELETE .../0100213775`.
 * Fail-open kupował tu prawie zero dostępności (przy realnej awarii DELETE i tak padnie),
 * a otwierał dokładnie to okno, dla którego ta bramka powstała.
 *
 * 🔑 Rozwiązanie: DRUGIE, NIEZALEŻNE ŹRÓDŁO własności. Lista wizyt pacjenta jest pobierana
 * spod adresu budowanego z `prodentisId` z PODPISANEGO TOKENU, więc nie da się jej podstawić.
 * Gdy odczyt pojedynczej wizyty milczy, pytamy listę:
 *   · wizyta na liście    → przepuszczamy (uczciwy pacjent odwołuje swoją wizytę mimo awarii),
 *   · wizyty nie ma       → 404, spójnie z piętrem A,
 *   · lista też milczy    → 503, bo zapis i tak by nie przeszedł.
 *
 * 🪤 `prodentisAptId === null` NIE wchodzi tutaj. `odswiezWizyte(null)` też zwraca
 * `unavailable`, ale to znaczy „ten wiersz w ogóle nie sięga do PMS" — takie odwołania
 * zapisujemy u siebie i zawiadamiamy gabinet. Blankietowe 503 odcięłoby tych pacjentów
 * od odwołania własnej wizyty. Dlatego wołający sprawdza `prodentisAptId` przed wywołaniem.
 */
export type WerdyktWlasnosci =
    | { wolno: true }
    | { wolno: false; status: 404 | 503; powod: 'obca' | 'nie_wiadomo' };

export async function czyWolnoRuszycWizyte(args: {
    stanWizyty: StanWizyty;
    prodentisAptId: string;
    prodentisId: string | null | undefined;
}): Promise<WerdyktWlasnosci> {
    const { stanWizyty, prodentisAptId, prodentisId } = args;

    // Ścieżka zwykła: PMS potwierdził stan wizyty i możemy porównać właściciela wprost.
    if (stanWizyty.ok) {
        return wizytaNalezyDoPacjenta(stanWizyty.wizyta, prodentisId)
            ? { wolno: true }
            : { wolno: false, status: 404, powod: 'obca' };
    }

    // Odczyt pojedynczej wizyty milczy — pytamy drugie źródło.
    const lista = await listaWizytPacjenta(prodentisId);
    if (!lista.ok) return { wolno: false, status: 503, powod: 'nie_wiadomo' };
    return znajdzWizyteNaLiscie(lista.lista, prodentisAptId)
        ? { wolno: true }
        : { wolno: false, status: 404, powod: 'obca' };
}

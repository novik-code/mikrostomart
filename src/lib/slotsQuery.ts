/**
 * Budowa zapytania do `GET /api/slots/free` w Prodentisie — walidacja na naszym brzegu.
 *
 * 🔑 Powód powstania (2026-09-04). Dostawca PMS wydał v11.0 z czterema nowymi parametrami
 * (`meta`, `days`, `doctor`, `policy`), a nasza trasa pośrednicząca przepuszczała wyłącznie
 * `date` i `duration` — więc nowej funkcjonalności nie dało się nawet ZMIERZYĆ, nie mówiąc
 * o przełączeniu. Ten plik jest jedynym miejscem, w którym powstaje adres do PMS-u.
 *
 * 🔴 GWARANCJA WSTECZNA, której nie wolno złamać: gdy nie podano żadnego z nowych parametrów,
 * zapytanie ma wyglądać DOKŁADNIE jak dotąd (`date` + `duration`), a odpowiedź pozostaje
 * gołą tablicą. Od tego zależy aplikacja mobilna ZAMROŻONA w sklepach — nie da się jej
 * naprawić deployem, gdyby kształt się zmienił.
 *
 * 🪤 Dlaczego walidujemy u siebie, skoro PMS też waliduje: bo ich API na śmieciowy `duration`
 * odpowiada PUSTĄ TABLICĄ, a nie błędem (zmierzone: `duration=abc` → `[]`). Pusta tablica
 * jest u nas nieodróżnialna od „brak wolnych terminów", więc literówka w parametrze
 * wyglądałaby dla pacjenta jak pełny grafik. Lepiej odrzucić ją na brzegu.
 */

export type WynikZapytania =
    | { ok: true; query: string }
    | { ok: false; blad: string; kod: 'invalid_date' | 'invalid_duration' | 'invalid_days' | 'invalid_doctor' | 'invalid_policy' };

/** Zakres uzgodniony z dostawcą: powyżej 14 PMS oddaje `400 DAYS_OUT_OF_RANGE`. */
export const MAX_DNI = 14;

export function zbudujZapytanieSlotow(p: URLSearchParams): WynikZapytania {
    const date = p.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { ok: false, kod: 'invalid_date', blad: 'Missing or invalid date parameter' };
    }

    // `duration` domyślnie 30 — tak samo jak dotąd, żeby stare wywołania bez tego parametru
    // zachowywały się identycznie.
    const rawDuration = p.get('duration');
    if (rawDuration !== null && !/^\d{1,3}$/.test(rawDuration)) {
        return { ok: false, kod: 'invalid_duration', blad: 'duration must be a number of minutes' };
    }
    const duration = rawDuration ?? '30';
    if (Number(duration) <= 0) {
        return { ok: false, kod: 'invalid_duration', blad: 'duration must be greater than zero' };
    }

    const czesci = [`date=${date}`, `duration=${duration}`];

    // ── parametry v11.0, wszystkie OPCJONALNE ──
    const days = p.get('days');
    if (days !== null) {
        if (!/^\d{1,2}$/.test(days) || Number(days) < 1 || Number(days) > MAX_DNI) {
            return { ok: false, kod: 'invalid_days', blad: `days must be between 1 and ${MAX_DNI}` };
        }
        czesci.push(`days=${days}`);
    }

    const doctor = p.get('doctor');
    if (doctor !== null) {
        // Identyfikatory Prodentisa to dziesięć cyfr (np. 0100000001). Odrzucamy wszystko inne,
        // żeby literówka wróciła jako błąd, a nie jako pusty kalendarz.
        if (!/^\d{10}$/.test(doctor)) {
            return { ok: false, kod: 'invalid_doctor', blad: 'doctor must be a 10-digit Prodentis id' };
        }
        czesci.push(`doctor=${doctor}`);
    }

    const policy = p.get('policy');
    if (policy !== null) {
        if (policy !== 'strict') {
            return { ok: false, kod: 'invalid_policy', blad: "policy accepts only 'strict'" };
        }
        czesci.push('policy=strict');
    }

    // `meta` przepuszczamy wyłącznie jako `1` — inne wartości milcząco pomijamy, żeby
    // przypadkowe `meta=0` czy `meta=true` nie zmieniło kształtu odpowiedzi bez ostrzeżenia.
    if (p.get('meta') === '1') czesci.push('meta=1');

    return { ok: true, query: czesci.join('&') };
}

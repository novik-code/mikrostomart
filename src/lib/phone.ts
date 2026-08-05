/**
 * JEDNO miejsce, w którym wolno dotknąć ciągu z numerem telefonu.
 *
 * ── DLACZEGO POWSTAŁ ─────────────────────────────────────────────────────────
 * Do 2026-08-05 każda trasa miała własną regułę i żadne dwie nie były zgodne:
 *  · rejestracja porównywała numer z tokenu z numerem z formularza po usunięciu
 *    WYŁĄCZNIE spacji i myślników — więc "+48790740770" ≠ "790740770" i pacjent
 *    dostawał „Niezgodność danych" na ostatnim kroku (zgłoszenie: Marek Nega);
 *  · logowanie szukało po DOKŁADNEJ równości z kolumną `phone`, a w bazie leżą
 *    obie postacie (zmierzone: 77 kont jako 9 cyfr, 13 jako "+48" + 9 cyfr) —
 *    czyli 13 osób mogło się zalogować tylko wpisując "+48", a reszta tylko bez;
 *  · `getPhoneVariants` w /verify brało OSTATNIE 9 CYFR dowolnego numeru i doklejało
 *    "+48", więc niemiecki "+49 170 1234567" odpytywał Prodentis o "+48701234567" —
 *    poprawnie wyglądający polski numer, mogący należeć do KOGOŚ INNEGO;
 *  · bramka SMS `/^48\d{9}$/` odrzucała każdy numer spoza Polski.
 *
 * ── ZASADA NACZELNA ──────────────────────────────────────────────────────────
 * 🔑 NIE ZGADUJEMY KRAJU. Kod kraju bierzemy z wejścia i nigdy go nie zmieniamy.
 * Domyślamy się wyłącznie tam, gdzie domysł jest jednoznaczny: gołe 9 cyfr to
 * numer polski, bo każdy polski numer krajowy ma dokładnie 9 cyfr.
 *
 * 🪤 WIODĄCE ZERO BEZ KODU KRAJU JEST NIEROZSTRZYGALNE i NIE WOLNO go zgadywać.
 * W rezerwacjach leżą numery w postaci "06 12 XXX XXX" — to holenderski prefiks
 * krajowy. Reguła „utnij zero, doklej +48" zamieniłaby taki numer na "+48612XXXXXX",
 * czyli poprawny polski numer stacjonarny (kierunkowy 61) — trafienie w CUDZY numer.
 * Takie wejście kończy się błędem i prośbą o kod kraju.
 *
 * Moduł jest CZYSTY: zero wejścia/wyjścia, zero zależności, nigdy nie rzuca.
 */

/** Wynik normalizacji. Celowo NIE goły string — wołający musi obsłużyć niejednoznaczność. */
export type PhoneResult =
    | { ok: true; e164: string }
    | { ok: false; reason: 'empty' | 'too_short' | 'too_long' | 'no_country_code' };

/** Najkrótsze i najdłuższe sensowne numery w E.164 (bez znaku „+"). */
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;
const PL_NATIONAL_LENGTH = 9;
const PL_CC = '48';

/**
 * Ujednolica znaki, które klienty poczty, iOS i kopiuj-wklej wstawiają zamiast
 * zwykłej spacji i myślnika. Bez tego numer wklejony z maila nie dopasuje się
 * do niczego, a użytkownik nie zobaczy różnicy na ekranie.
 */
function stripSeparators(input: string): string {
    return input
        .replace(/[     ​]/g, '') // spacje nierozdzielające i włosowe
        .replace(/[‐-―−﹘﹣－]/g, '') // półpauzy, łączniki niełamiące, minus
        .replace(/[\s().\-/]/g, '');
}

/**
 * Sprowadza dowolny zapis numeru do postaci E.164 („+" i same cyfry).
 * Zwraca błąd zamiast zgadywać, gdy kraju nie da się ustalić.
 */
export function toE164(input: string | null | undefined, defaultRegion: 'PL' = 'PL'): PhoneResult {
    if (!input) return { ok: false, reason: 'empty' };

    const cleaned = stripSeparators(String(input));
    if (!cleaned) return { ok: false, reason: 'empty' };

    // Kod kraju podany wprost — bierzemy DOSŁOWNIE, bez doklejania i bez obcinania.
    if (cleaned.startsWith('+') || cleaned.startsWith('00')) {
        const digits = (cleaned.startsWith('+') ? cleaned.slice(1) : cleaned.slice(2)).replace(/\D/g, '');
        if (digits.length < MIN_DIGITS) return { ok: false, reason: 'too_short' };
        if (digits.length > MAX_DIGITS) return { ok: false, reason: 'too_long' };
        return { ok: true, e164: `+${digits}` };
    }

    const digits = cleaned.replace(/\D/g, '');
    if (!digits) return { ok: false, reason: 'empty' };

    // Gołe 9 cyfr — JEDYNY przypadek, w którym domyślamy się kraju.
    if (digits.length === PL_NATIONAL_LENGTH && defaultRegion === 'PL') {
        return { ok: true, e164: `+${PL_CC}${digits}` };
    }

    // "48XXXXXXXXX" — postać, którą mówi nasz własny tor SMS-owy.
    if (digits.length === PL_CC.length + PL_NATIONAL_LENGTH && digits.startsWith(PL_CC)) {
        return { ok: true, e164: `+${digits}` };
    }

    if (digits.length < MIN_DIGITS) return { ok: false, reason: 'too_short' };
    // Wszystko inne bez kodu kraju (w tym wiodące zero) — patrz pułapka w nagłówku.
    return { ok: false, reason: 'no_country_code' };
}

/** Czy dwa zapisy oznaczają ten sam numer. Gdy któregoś nie da się znormalizować — porównanie zapasowe. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
    const ra = toE164(a);
    const rb = toE164(b);
    if (ra.ok && rb.ok) return ra.e164 === rb.e164;
    // Zapas: dokładnie to, co robił kod przed wprowadzeniem modułu. Nigdy nie zawężamy.
    const fa = stripSeparators(String(a ?? ''));
    const fb = stripSeparators(String(b ?? ''));
    return fa !== '' && fa === fb;
}

/**
 * WSZYSTKIE postacie, w jakich ten numer może już leżeć w bazie.
 *
 * 🔑 To jest most, dzięki któremu naprawa NIE WYMAGA migracji danych i nie może
 * odebrać nikomu dostępu: lista zawsze zawiera surowe wejście, więc wszystko,
 * co dopasowywało się przed zmianą, dopasowuje się nadal. Zmiana wyłącznie POSZERZA.
 */
export function phoneLookupVariants(input: string | null | undefined): string[] {
    const out = new Set<string>();
    const raw = String(input ?? '').trim();
    if (raw) {
        out.add(raw);
        out.add(stripSeparators(raw)); // stare zachowanie tras: bez spacji i myślników
    }

    const res = toE164(input);
    if (res.ok) {
        const digits = res.e164.slice(1);
        out.add(res.e164); // +48790740770
        out.add(digits); // 48790740770
        out.add(`00${digits}`); // 0048790740770
        if (digits.startsWith(PL_CC) && digits.length === PL_CC.length + PL_NATIONAL_LENGTH) {
            const core = digits.slice(PL_CC.length);
            out.add(core); // 790740770
            out.add(`${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`); // 790 740 770
            out.add(`+${PL_CC} ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`);
        }
    }

    return [...out].filter(Boolean);
}

/**
 * Zapytania do Prodentisa w kolejności trafień.
 * 🔑 Dla numeru ZAGRANICZNEGO nigdy nie generujemy wariantu z „48" — to właśnie
 * robił stary `getPhoneVariants` i mógł trafić w rekord innej osoby.
 */
export function prodentisPhoneQueries(input: string | null | undefined): string[] {
    const res = toE164(input);
    if (!res.ok) {
        const raw = String(input ?? '').trim();
        return raw ? [raw] : [];
    }
    const digits = res.e164.slice(1);

    if (digits.startsWith(PL_CC) && digits.length === PL_CC.length + PL_NATIONAL_LENGTH) {
        const core = digits.slice(PL_CC.length);
        return [
            core,
            `${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`,
            res.e164,
            `+${PL_CC} ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`,
            digits,
            `00${digits}`,
        ];
    }
    // Zagraniczny: pełna postać, same cyfry, z „00". ŻADNEGO doklejania 48.
    return [res.e164, digits, `00${digits}`];
}

/** Postać oczekiwana przez bramkę SMSAPI: same cyfry z kodem kraju, bez „+". */
export function toSmsRecipient(input: string | null | undefined): string | null {
    const res = toE164(input);
    return res.ok ? res.e164.slice(1) : null;
}

/**
 * Klucz porównawczy do dopasowywania pacjentów (rezerwacje online).
 * Nigdy nie zwraca pustego ciągu dla niepustego wejścia — inaczej dwa nieznormalizowane
 * numery „zrównałyby się" na pustce i skleiły dwie różne osoby.
 */
export function phoneMatchKey(input: string | null | undefined): string {
    const res = toE164(input);
    if (res.ok) return res.e164.slice(1);
    return String(input ?? '').replace(/\D/g, '');
}

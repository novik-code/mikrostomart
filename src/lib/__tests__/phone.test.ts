/**
 * Testy normalizacji numerów telefonu.
 *
 * Najważniejszy blok to „ZMIANA WYŁĄCZNIE POSZERZA" — dowodzi, że każde wejście,
 * które dopasowywało się przed wprowadzeniem modułu, dopasowuje się nadal.
 * Bez tego nie wolno tknąć logowania: w bazie leżą DWIE postacie numeru
 * (zmierzone 2026-08-05: 77 kont jako gołe 9 cyfr, 13 jako "+48" + 9 cyfr).
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    toE164,
    samePhone,
    phoneLookupVariants,
    prodentisPhoneQueries,
    toSmsRecipient,
    phoneMatchKey,
} from '../phone';

const PL = '+48790740770';

describe('polski numer — każdy zapis daje tę samą postać', () => {
    const inputs = [
        '790740770',
        '790 740 770',
        '790-740-770',
        '790.740.770',
        '(790) 740 770',
        '+48790740770',
        '+48 790 740 770',
        '+48-790-740-770',
        '48790740770',
        '0048790740770',
        '0048 790 740 770',
        '  790740770  ',
        '790 740 770', // spacja nierozdzielająca z kopiuj-wklej
        '790 740 770', // wąska spacja nierozdzielająca
        '790‑740‑770', // łącznik niełamiący z klienta poczty
        '790–740–770', // półpauza z autokorekty iOS
    ];

    for (const input of inputs) {
        it(`„${input}" → ${PL}`, () => {
            const r = toE164(input);
            expect(r.ok).toBe(true);
            if (r.ok) expect(r.e164).toBe(PL);
        });
    }
});

describe('numery zagraniczne — kod kraju nietknięty', () => {
    it('brytyjski zostaje brytyjski', () => {
        const r = toE164('+44 7700 900123');
        expect(r.ok && r.e164).toBe('+447700900123');
    });

    it('holenderski zostaje holenderski', () => {
        const r = toE164('+31 6 12345678');
        expect(r.ok && r.e164).toBe('+31612345678');
    });

    it('islandzki (7 cyfr po kodzie) jest obsługiwany — stary kod go GUBIŁ', () => {
        // getPhoneVariants miał `if (core.length !== 9) return [phone]`.
        const r = toE164('+354 7123456');
        expect(r.ok && r.e164).toBe('+3547123456');
    });

    it('z zapisu 00 też bierzemy kraj dosłownie', () => {
        const r = toE164('0049 170 1234567');
        expect(r.ok && r.e164).toBe('+491701234567');
    });

    it('🔴 NIGDY nie dokleja 48 do numeru zagranicznego', () => {
        // Stary getPhoneVariants brał ostatnie 9 cyfr i robił "+48701234567" —
        // poprawny polski numer, mogący należeć do kogoś innego.
        for (const q of prodentisPhoneQueries('+49 170 1234567')) {
            expect(q).not.toMatch(/(^|\+)48\d{9}$/);
        }
    });
});

describe('🪤 wiodące zero bez kodu kraju jest ODRZUCANE, nie zgadywane', () => {
    it('holenderski numer krajowy nie zamienia się w polski', () => {
        // "06 12 345 678" → naiwne „utnij zero, doklej +48" dałoby +48612345678,
        // czyli poprawny polski numer stacjonarny. Trafienie w CUDZY numer.
        const r = toE164('06 12 345 678');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('no_country_code');
    });

    it('podaje powód, żeby dało się poprosić o kod kraju', () => {
        const r = toE164('0612345678');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('no_country_code');
    });
});

describe('wejścia bezsensowne nie wywracają modułu', () => {
    for (const bad of ['', '   ', null, undefined, 'abc', '12', '1234567890123456789']) {
        it(`„${String(bad)}" zwraca błąd, nie wyjątek`, () => {
            expect(() => toE164(bad as string)).not.toThrow();
            expect(toE164(bad as string).ok).toBe(false);
        });
    }
});

describe('🔑 ZMIANA WYŁĄCZNIE POSZERZA — nikt nie traci dostępu', () => {
    it('lista dopasowań ZAWSZE zawiera surowe wejście', () => {
        for (const input of ['790740770', '+48790740770', '790 740 770', '+44 7700 900123', '0612345678']) {
            expect(phoneLookupVariants(input)).toContain(input);
        }
    });

    it('zawiera też postać po usunięciu spacji i myślników (stare zachowanie tras)', () => {
        expect(phoneLookupVariants('790 740 770')).toContain('790740770');
        expect(phoneLookupVariants('+48 790 740 770')).toContain('+48790740770');
    });

    it('obie postacie realnie leżące w bazie znajdują się nawzajem', () => {
        // 77 kont trzyma gołe 9 cyfr, 13 trzyma "+48" + 9 cyfr.
        expect(phoneLookupVariants('790740770')).toContain('+48790740770');
        expect(phoneLookupVariants('+48790740770')).toContain('790740770');
    });

    it('nawet numer nierozstrzygalny da się wyszukać po tym, co wpisano', () => {
        // Brak kodu kraju nie może oznaczać pustej listy — konto założone w takiej
        // postaci musi dać się odnaleźć.
        expect(phoneLookupVariants('0612345678').length).toBeGreaterThan(0);
    });
});

describe('porównanie numerów przy rejestracji', () => {
    it('🔴 przypadek, który blokował zakładanie konta', () => {
        // Krok 1 podpisywał token tym, co wpisał pacjent; krok 2 wysyłał postać
        // z Prodentisa. Równość stringów dawała 403 „Niezgodność danych".
        expect(samePhone('+48 790 740 770', '790740770')).toBe(true);
    });

    it('różne numery nadal są różne', () => {
        expect(samePhone('790740770', '790740771')).toBe(false);
        expect(samePhone('+48790740770', '+44790740770')).toBe(false);
    });

    it('nie zrównuje dwóch pustych ani nierozstrzygalnych wejść', () => {
        expect(samePhone('', '')).toBe(false);
        expect(samePhone(null, undefined)).toBe(false);
    });

    it('zachowuje zapasowe porównanie dla numerów bez kodu kraju', () => {
        expect(samePhone('0612345678', '06 12 345 678')).toBe(true);
        expect(samePhone('0612345678', '0612345679')).toBe(false);
    });
});

describe('bramka SMS przyjmuje zagraniczne, a polskie zostawia jak było', () => {
    it('polski wychodzi jako 48XXXXXXXXX — dokładnie jak dotąd', () => {
        expect(toSmsRecipient('790740770')).toBe('48790740770');
        expect(toSmsRecipient('+48 790 740 770')).toBe('48790740770');
    });

    it('zagraniczny w ogóle wychodzi (stara bramka /^48\\d{9}$/ go odrzucała)', () => {
        expect(toSmsRecipient('+44 7700 900123')).toBe('447700900123');
    });

    it('numeru nierozstrzygalnego nie wysyłamy w ciemno', () => {
        expect(toSmsRecipient('0612345678')).toBeNull();
    });
});

describe('okablowanie — trasy realnie wołają wspólny moduł', () => {
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

    it('logowanie szuka po wszystkich postaciach numeru', () => {
        const src = read('src/app/api/patients/login/route.ts');
        expect(src).toMatch(/\.in\('phone', phoneLookupVariants\(/);
        // Dokładna równość odebrałaby dostęp 13 kontom zapisanym jako "+48…".
        expect(src).not.toMatch(/query\.eq\('phone', loginIdentifier\)/);
    });

    it('reset hasła szuka tak samo jak logowanie', () => {
        expect(read('src/app/api/patients/reset-password/request/route.ts'))
            .toMatch(/\.in\('phone', phoneLookupVariants\(/);
    });

    it('rejestracja porównuje numery przez samePhone, nie przez równość stringów', () => {
        const src = read('src/app/api/patients/register/route.ts');
        expect(src).toMatch(/if \(!samePhone\(phone, tokenPayload\.phone\)\)/);
        expect(src).not.toMatch(/normalizedBodyPhone !== normalizedTokenPhone/);
    });

    it('🔴 /verify nie generuje już wariantów z doklejonym 48', () => {
        const src = read('src/app/api/patients/verify/route.ts');
        expect(src).toMatch(/prodentisPhoneQueries\(/);
        expect(src).not.toMatch(/function getPhoneVariants/);
        expect(src).not.toMatch(/variants\.add\(`\+48\$\{core\}`\)/);
    });

    it('bramka SMS nie jest już przypięta do prefiksu 48', () => {
        const src = read('src/lib/smsService.ts');
        expect(src).toMatch(/toSmsRecipient\(to\)/);
        expect(src).not.toMatch(/const phoneRegex = \/\^48/);
    });

    it('dopasowanie pacjenta w rezerwacjach idzie przez wspólny klucz', () => {
        expect(read('src/lib/doctorMapping.ts')).toMatch(/return phoneMatchKey\(phone\)/);
    });
});

describe('klucz dopasowania pacjenta (rezerwacje online)', () => {
    it('polski numer daje ten sam klucz co stary normalizePhone', () => {
        // Stary: 9 cyfr → "48"+cyfry. Nowy musi dać identycznie, inaczej dopasowanie
        // pacjentów przy rezerwacji online zmieniłoby zachowanie.
        expect(phoneMatchKey('790740770')).toBe('48790740770');
        expect(phoneMatchKey('+48790740770')).toBe('48790740770');
        expect(phoneMatchKey('0048790740770')).toBe('48790740770');
        expect(phoneMatchKey('48790740770')).toBe('48790740770');
    });

    it('nigdy nie zwraca pustki dla niepustego wejścia', () => {
        // Pustka po obu stronach porównania skleiłaby dwie różne osoby.
        expect(phoneMatchKey('0612345678')).not.toBe('');
        expect(phoneMatchKey('abc123')).toBe('123');
    });
});

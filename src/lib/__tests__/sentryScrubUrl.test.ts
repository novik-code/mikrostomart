/**
 * STRAŻNIK: ŻYWE POŚWIADCZENIA NIE JADĄ DO SENTRY (znalezione 06.09 przy P-088).
 *
 * 🔴 CO BYŁO ZEPSUTE. `beforeSend` w `sentry.client.config.ts` filtrował wyłącznie po
 * user-agencie botów — nie dotykał adresu zdarzenia. Tymczasem SZEŚĆ stron trzyma sekret
 * wprost w ŚCIEŻCE (`/zgody/<token>`, `/ekarta/<token>`, `/opieka/<token>`, `/s/<code>`,
 * `/strefa-pacjenta/reset-password/<token>`, `/register/verify-email/<token>`), a landing
 * wizyty w query (`/wizyta/<typ>?token=…`). Każdy nieobsłużony błąd JS na którejkolwiek
 * z nich wysyłał ŻYWE poświadczenie do zewnętrznej usługi — a przy resecie hasła
 * i weryfikacji e-maila jest to poświadczenie PRZEJMUJĄCE KONTO.
 *
 * 🔑 `Referrer-Policy` NIE jest tu obroną i sprawdziłem to: `next.config.ts` ustawia
 * `strict-origin-when-cross-origin`, więc do obcych domen idzie sam origin. Sentry
 * dostaje adres nie przez nagłówek Referer, tylko dlatego, że sami mu go wysyłamy
 * w ładunku zdarzenia.
 *
 * DOWÓD, ŻE GRYZIE (cofka): każdy przypadek niżej ma parę „adres wejściowy → wynik".
 * Usuń wzorzec z listy w `lib/sentryScrubUrl.ts` → pada odpowiedni test.
 *
 * Uruchomienie: `npx vitest run sentryScrubUrl`
 */

import { describe, it, expect } from 'vitest';
import { wyczyscAdresZSekretow } from '@/lib/sentryScrubUrl';

const TOKEN = 'ff11e2a09c3d4b7e8a1f0d2c4e6a8b90';

describe('sentryScrubUrl · sekret w ŚCIEŻCE', () => {
    const przypadki: [string, string][] = [
        ['zgoda', `https://www.mikrostomart.pl/zgody/${TOKEN}`],
        ['e-Karta', `https://www.mikrostomart.pl/ekarta/${TOKEN}`],
        ['plan opieki', `https://www.mikrostomart.pl/opieka/${TOKEN}`],
        ['short-link', 'https://www.mikrostomart.pl/s/abc123xyz0'],
        ['reset hasła', `https://www.mikrostomart.pl/pl/strefa-pacjenta/reset-password/${TOKEN}`],
        ['weryfikacja e-maila', `https://www.mikrostomart.pl/pl/strefa-pacjenta/register/verify-email/${TOKEN}`],
    ];

    for (const [nazwa, adres] of przypadki) {
        it(`🔴 ${nazwa}: sekret znika ze ścieżki, reszta adresu zostaje`, () => {
            const wynik = wyczyscAdresZSekretow(adres);

            expect(wynik).not.toContain(TOKEN);
            expect(wynik).not.toContain('abc123xyz0');
            // Diagnostyka MUSI przeżyć — inaczej zgłoszenie przestaje być użyteczne.
            expect(wynik).toContain('mikrostomart.pl');
            expect(wynik).toContain('[usuniete]');
        });
    }
});

describe('sentryScrubUrl · sekret w QUERY', () => {
    it('🔴 landing wizyty: `token` maskowany, reszta parametrów zostaje', () => {
        const wynik = wyczyscAdresZSekretow(
            `https://www.mikrostomart.pl/pl/wizyta/konsultacja?token=${TOKEN}&date=2026-09-11&doctor=Kowalski`
        );

        expect(wynik).not.toContain(TOKEN);
        expect(wynik).toContain('date=2026-09-11');
        expect(wynik).toContain('doctor=Kowalski');
        expect(wynik).toContain('/wizyta/konsultacja');
    });

    it('maskuje też pozostałe nazwy poświadczeń', () => {
        const wynik = wyczyscAdresZSekretow(
            `https://x.test/a?consentToken=${TOKEN}&secret=abc&apiKey=def&code=ghi`
        );
        for (const tajne of [TOKEN, 'abc', 'def', 'ghi']) {
            expect(wynik).not.toContain(tajne);
        }
    });
});

describe('sentryScrubUrl · nie psuje zwykłych adresów', () => {
    it('adres bez sekretu wraca bez zmian', () => {
        const adres = 'https://www.mikrostomart.pl/pl/cennik?kategoria=implanty';
        expect(wyczyscAdresZSekretow(adres)).toBe(adres);
    });

    it('🪤 `/zgody` bez segmentu tokenu nie jest maskowane', () => {
        const adres = 'https://www.mikrostomart.pl/zgody';
        expect(wyczyscAdresZSekretow(adres)).toBe(adres);
    });

    it('🪤 śmieciowe wejście nie wywraca `beforeSend`', () => {
        for (const smiec of ['', 'nie-adres', 'javascript:void(0)']) {
            expect(() => wyczyscAdresZSekretow(smiec)).not.toThrow();
        }
    });
});

describe('sentryScrubUrl · druga połowa kontraktu', () => {
    it('🔴 `beforeSend` realnie tego używa — inaczej funkcja jest ozdobą', async () => {
        const { readFileSync } = await import('node:fs');
        const zrodlo = readFileSync('sentry.client.config.ts', 'utf8');

        // Kontrola pozytywna: plik nadal ma `beforeSend`.
        expect(zrodlo).toContain('beforeSend');

        /**
         * 🪤 ASERCJA MUSI CELOWAĆ W PRZYPISANIE, NIE W OBECNOŚĆ NAZWY. Pierwsza wersja
         * sprawdzała `toContain('wyczyscAdresZSekretow')` i przechodziła po WYŁĄCZENIU
         * czyszczenia adresu zdarzenia — bo nazwa zostawała w imporcie i w pętli po
         * okruchach. Zmierzone cofką: 12/12 na zielono przy zdjętej ochronie.
         */
        expect(zrodlo).toMatch(/event\.request\.url\s*=\s*wyczyscAdresZSekretow/);
        expect(zrodlo).toMatch(/breadcrumbs/);
    });
});

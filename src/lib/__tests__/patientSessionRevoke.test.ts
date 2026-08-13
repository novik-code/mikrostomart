/**
 * Rewokacja sesji pacjenta — test ZACHOWANIA (migracja 197, takt 2).
 *
 * 🔴 STAWKA JEST OBUSTRONNA i dlatego to musi być test wykonania, nie asercja na pliku:
 *   • za słabo → skradziony token żyje 30 dni mimo zmiany hasła,
 *   • za mocno → wylogowani zostają WSZYSCY pacjenci naraz, w środku dnia pracy gabinetu.
 * Druga pomyłka jest głośniejsza, ale pierwsza gorsza.
 */
import { describe, it, expect } from 'vitest';
import { czySesjaUniewazniona } from '@/lib/jwt';

/** `iat` jest w SEKUNDACH — tak podpisuje `jwt.sign`. */
const sek = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const EPOKA = '1970-01-01T00:00:00.000Z';

describe('czySesjaUniewazniona', () => {
    it('token WYSTAWIONY PRZED zmianą hasła → unieważniony', () => {
        expect(czySesjaUniewazniona(sek('2026-08-01T10:00:00Z'), '2026-08-13T09:00:00.000Z')).toBe(true);
    });

    it('token wystawiony PO zmianie hasła → ważny', () => {
        expect(czySesjaUniewazniona(sek('2026-08-13T10:00:00Z'), '2026-08-13T09:00:00.000Z')).toBe(false);
    });

    it('🔴 domyślna 1970 nie unieważnia NIKOGO', () => {
        // Migracja 197 wypełnia kolumnę wartością to_timestamp(0). Gdyby ten przypadek
        // wypadł na `true`, wgranie migracji wylogowałoby wszystkich 107 pacjentów.
        expect(czySesjaUniewazniona(sek('2026-08-13T10:00:00Z'), EPOKA)).toBe(false);
        expect(czySesjaUniewazniona(sek('1999-01-01T00:00:00Z'), EPOKA)).toBe(false);
    });

    it('🪤 token wystawiony w TEJ SAMEJ sekundzie co zmiana hasła → ważny', () => {
        // `iat` zaokrągla w dół do sekundy, `sessions_valid_from` ma milisekundy.
        // Bez tolerancji pacjent zmieniający hasło wylatywałby natychmiast po zalogowaniu.
        const t = '2026-08-13T09:00:00';
        expect(czySesjaUniewazniona(sek(t + 'Z'), t + '.500Z')).toBe(false);
        expect(czySesjaUniewazniona(sek(t + 'Z'), t + '.999Z')).toBe(false);
    });

    it('tolerancja jest WĄSKA — token starszy o pół minuty już nie przechodzi', () => {
        expect(czySesjaUniewazniona(sek('2026-08-13T08:59:30Z'), '2026-08-13T09:00:00.000Z')).toBe(true);
    });

    it('każde „nie wiem” znaczy NIE unieważniaj', () => {
        const teraz = sek('2026-08-13T10:00:00Z');
        expect(czySesjaUniewazniona(undefined, '2026-08-13T09:00:00.000Z')).toBe(false); // token bez iat
        expect(czySesjaUniewazniona(teraz, null)).toBe(false);                            // brak daty
        expect(czySesjaUniewazniona(teraz, undefined)).toBe(false);
        expect(czySesjaUniewazniona(teraz, 'to-nie-jest-data')).toBe(false);              // śmieci w kolumnie
        expect(czySesjaUniewazniona(teraz, '')).toBe(false);
    });
});

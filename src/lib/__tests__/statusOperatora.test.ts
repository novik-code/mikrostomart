import { describe, it, expect } from 'vitest';
import { komunikatStatusu } from '../statusOperatora';

const o = (nextAvailable?: string | null) => ({ imie: 'dr Marcin Nowosielski', nextAvailable });

/**
 * Strażnik punktu 3e. Sedno: przy `unknown` i przy nieznanym statusie NIE WOLNO powiedzieć,
 * że terminów nie ma — dostawca PMS wprowadził `unknown` właśnie po to, żeby API mogło
 * przyznać się do niewiedzy, a nasz asystent AI powtarza takie zdania pacjentowi w mailu.
 * DOWÓD COFKI: sprowadzenie wszystkich statusów do jednego napisu „Brak wolnych terminów"
 * (stan sprzed 3e) wywala pięć asercji.
 */
describe('komunikatStatusu', () => {
    it('fully_booked — mówi, że lekarz PRZYJMUJE, i podaje najbliższy termin', () => {
        const k = komunikatStatusu('fully_booked', o('2026-09-14'));
        expect(k.tresc).toContain('przyjmuje tego dnia');
        expect(k.tresc).toContain('wszystkie terminy online są już zajęte');
        expect(k.skokDo).toBe('2026-09-14');
        expect(k.telefon).toBe(false); // jest dokąd skoczyć — telefon nie jest potrzebny
    });

    it('fully_booked BEZ najbliższego terminu → proponujemy telefon', () => {
        const k = komunikatStatusu('fully_booked', o(null));
        expect(k.telefon).toBe(true);
        expect(k.skokDo).toBeUndefined();
    });

    it('🔴 not_bookable_online — lekarz JEST w gabinecie, tylko nie online', () => {
        const k = komunikatStatusu('not_bookable_online', o());
        expect(k.tresc).toContain('przyjmuje tego dnia');
        expect(k.tresc).toContain('nie umówimy online');
        expect(k.telefon).toBe(true);
        // dotąd ten dzień pokazywał „brak wolnych terminów" — komunikat FAŁSZYWY
        expect(k.tresc).not.toContain('Brak wolnych terminów');
    });

    it('not_working — nie przyjmuje, ale bez powodu nieobecności', () => {
        const k = komunikatStatusu('not_working', o('2026-10-05'));
        expect(k.tresc).toContain('nie przyjmuje tego dnia');
        expect(k.skokDo).toBe('2026-10-05');
        // ⚪ powód (urlop) to dana kadrowa — nie pokazujemy jej pacjentowi
        expect(k.tresc.toLowerCase()).not.toContain('urlop');
        expect(k.tresc.toLowerCase()).not.toContain('absence');
    });

    it('🔴 unknown NIE TWIERDZI, że terminów nie ma', () => {
        const k = komunikatStatusu('unknown', o());
        expect(k.tresc).toContain('Nie potrafimy');
        expect(k.tresc).toContain('To nie znaczy, że ich nie ma');
        expect(k.telefon).toBe(true);
        expect(k.ton).toBe('ostrzegawczy');
    });

    it('🔴 NIEZNANY status z przyszłej wersji API zachowuje się jak unknown', () => {
        const k = komunikatStatusu('cos_nowego_w_v12', o());
        expect(k.tresc).toContain('Nie potrafimy');
        expect(k.ton).toBe('ostrzegawczy');
        expect(k.telefon).toBe(true);
    });

    it('brak statusu (starsze API bez meta) też nie kłamie', () => {
        expect(komunikatStatusu(undefined, o()).tresc).toContain('Nie potrafimy');
    });

    it('available — dopiero TU wolno powiedzieć „brak terminów w tym dniu"', () => {
        // status mówi „są okna", ale po naszych filtrach (:00/:30, wyprzedzenie) lista bywa pusta
        const k = komunikatStatusu('available', o());
        expect(k.tresc).toContain('Brak wolnych terminów');
        expect(k.telefon).toBe(false);
    });

    it('opis dnia wplatany, gdy podany', () => {
        expect(komunikatStatusu('not_working', { imie: 'X', dzienOpisowo: 'czwartek, 10 września' }).tresc)
            .toContain('(czwartek, 10 września)');
    });
});

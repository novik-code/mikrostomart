import { describe, it, expect } from 'vitest';
import { ocenTydzien, type WynikDnia } from '../slotsFetchOutcome';

const udany = (n: number): WynikDnia => ({ ok: true, liczbaSlotow: n });
const padl = (status?: number): WynikDnia => ({ ok: false, status });

/**
 * Strażnik usterki z 2026-09-03: kalendarz pokazywał „Brak wolnych terminów" także wtedy,
 * gdy zapytania padły (429 z naszego limitu, awaria PMS-u, zły kształt odpowiedzi).
 * DOWÓD COFKI: reguła sprzed naprawy — „pusto, jeśli nie ma slotów", bez patrzenia na
 * niepowodzenia — wywala trzy asercje opisujące awarię.
 */
describe('ocenTydzien', () => {
    it('są terminy → pokazujemy terminy', () => {
        expect(ocenTydzien([udany(3), udany(0)], 3)).toEqual({ rodzaj: 'terminy' });
    });

    it('wszystkie dni odpowiedziały, wszystkie puste → dopiero TO jest brak terminów', () => {
        expect(ocenTydzien([udany(0), udany(0), udany(0)], 0)).toEqual({ rodzaj: 'pusto' });
    });

    it('🔴 nic nie dojechało, a dzień padł na 429 → LIMIT, nie „brak terminów"', () => {
        expect(ocenTydzien([padl(429), udany(0)], 0)).toEqual({ rodzaj: 'blad', powod: 'limit' });
    });

    it('🔴 nic nie dojechało, a PMS oddał 502 → AWARIA, nie „brak terminów"', () => {
        expect(ocenTydzien([padl(502), udany(0)], 0)).toEqual({ rodzaj: 'blad', powod: 'awaria' });
    });

    it('🔴 nic nie dojechało, a dzień padł bez statusu (zerwana sieć) → AWARIA', () => {
        expect(ocenTydzien([padl(), padl()], 0)).toEqual({ rodzaj: 'blad', powod: 'awaria' });
    });

    it('429 wygrywa z innymi błędami — lek jest inny (odczekaj, nie dzwoń)', () => {
        expect(ocenTydzien([padl(500), padl(429)], 0)).toEqual({ rodzaj: 'blad', powod: 'limit' });
    });

    it('część dni padła, ale terminy są → pokazujemy terminy, bez straszenia awarią', () => {
        expect(ocenTydzien([padl(429), udany(4)], 4)).toEqual({ rodzaj: 'terminy' });
    });

    it('dni przyszły z terminami, ale NASZE filtry wyzerowały listę → to pustka, nie awaria', () => {
        // sloty były, ale wypadły na siatce :00/:30 albo na min_days_ahead
        expect(ocenTydzien([udany(6), udany(2)], 0)).toEqual({ rodzaj: 'pusto' });
    });
});

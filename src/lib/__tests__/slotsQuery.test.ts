import { describe, it, expect } from 'vitest';
import { zbudujZapytanieSlotow } from '../slotsQuery';

const q = (s: string) => zbudujZapytanieSlotow(new URLSearchParams(s));
/** Skrót do treści zapytania — wywala test, jeśli walidacja odrzuciła wejście. */
const query = (s: string): string => {
    const r = q(s);
    if (!r.ok) throw new Error(`oczekiwano poprawnego zapytania, dostano błąd: ${r.blad}`);
    return r.query;
};

describe('zbudujZapytanieSlotow', () => {
    it('🔴 GWARANCJA WSTECZNA: bez nowych parametrów zapytanie jak dotąd', () => {
        expect(q('date=2026-09-09&duration=30')).toEqual({ ok: true, query: 'date=2026-09-09&duration=30' });
    });

    it('brak duration → 30, tak jak przed v11.0', () => {
        expect(q('date=2026-09-09')).toEqual({ ok: true, query: 'date=2026-09-09&duration=30' });
    });

    it('🪤 śmieciowy duration ODRZUCONY na brzegu — PMS oddałby na niego pustą tablicę', () => {
        // Pusta tablica jest u nas nieodróżnialna od „brak wolnych terminów",
        // więc literówka wyglądałaby dla pacjenta jak pełny grafik.
        expect(q('date=2026-09-09&duration=abc').ok).toBe(false);
        expect(q('date=2026-09-09&duration=0').ok).toBe(false);
        expect(q('date=2026-09-09&duration=-5').ok).toBe(false);
    });

    it('zła data odrzucona', () => {
        expect(q('date=nie-data').ok).toBe(false);
        expect(q('duration=30').ok).toBe(false);
    });

    it('meta=1 przepuszczone, inne wartości meta pomijane po cichu', () => {
        expect(query('date=2026-09-09&meta=1')).toContain('meta=1');
        expect(query('date=2026-09-09&meta=true')).not.toContain('meta');
        expect(query('date=2026-09-09&meta=0')).not.toContain('meta');
    });

    it('days w zakresie 1..14', () => {
        expect(query('date=2026-09-09&days=5')).toContain('days=5');
        expect(q('date=2026-09-09&days=14').ok).toBe(true);
        expect(q('date=2026-09-09&days=15').ok).toBe(false);
        expect(q('date=2026-09-09&days=0').ok).toBe(false);
        expect(q('date=2026-09-09&days=x').ok).toBe(false);
    });

    it('🪤 doctor musi mieć 10 cyfr — literówka ma wrócić BŁĘDEM, nie pustym kalendarzem', () => {
        expect(query('date=2026-09-09&doctor=0100000003')).toContain('doctor=0100000003');
        expect(q('date=2026-09-09&doctor=marcin').ok).toBe(false);
        expect(q('date=2026-09-09&doctor=010000000').ok).toBe(false);
    });

    it('policy przyjmuje OBIE znane wartości, resztę odrzuca', () => {
        expect(query('date=2026-09-09&policy=strict')).toContain('policy=strict');
        // 🔴 Od v11.13 `strict` jest domyślne, a `legacy` to JEDYNE wyjście awaryjne
        // przywracające starty :15/:45. Blokując je, odcinaliśmy sobie drogę odwrotu.
        expect(query('date=2026-09-09&policy=legacy')).toContain('policy=legacy');
        expect(q('date=2026-09-09&policy=nieznana').ok).toBe(false);
        expect(q('date=2026-09-09&policy=').ok).toBe(false);
    });

    it('komplet parametrów w stabilnej kolejności', () => {
        const r = q('date=2026-09-07&duration=60&days=5&doctor=0100000030&policy=strict&meta=1');
        expect(r).toEqual({ ok: true, query: 'date=2026-09-07&duration=60&days=5&doctor=0100000030&policy=strict&meta=1' });
    });

    it('nieznane parametry nie przeciekają do PMS', () => {
        expect(query('date=2026-09-09&admin=1&debug=true')).toBe('date=2026-09-09&duration=30');
    });
});

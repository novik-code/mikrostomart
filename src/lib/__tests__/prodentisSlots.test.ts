import { describe, it, expect } from 'vitest';
import { odczytajSloty, godzinaSlotu, podsumujDzienPoLekarzach } from '../prodentisSlots';

const slot = (start: string, doctorName?: string) => ({ doctor: '0100000001', doctorName, start });

/**
 * Strażnik usterki z 2026-09-04: asystent AI czytał `slotsData.slots`, a API oddaje gołą
 * tablicę — gałąź proponująca terminy nigdy się nie wykonała. Pod spodem czekał drugi błąd:
 * `slot.time || slot.startTime` (takich pól nie ma; godzina jest w `start`).
 * DOWÓD COFKI: `odczytajSloty` czytające wyłącznie `payload.slots` wywala pierwszy przypadek;
 * `godzinaSlotu` sięgające po `slot.time` wywala trzeci i piąty.
 */
describe('odczytajSloty', () => {
    it('🔴 GOŁA TABLICA — dzisiejszy kształt API (tu leżała usterka)', () => {
        expect(odczytajSloty([slot('2026-10-12T10:00:00')])).toHaveLength(1);
    });

    it('koperta { slots: [...] } — kształt po wdrożeniu meta=1 u dostawcy PMS', () => {
        expect(odczytajSloty({ slots: [slot('2026-10-12T10:00:00')], doctors: [] })).toHaveLength(1);
    });

    it('pusta tablica i pusta koperta → pusto, bez wyjątku', () => {
        expect(odczytajSloty([])).toEqual([]);
        expect(odczytajSloty({ slots: [] })).toEqual([]);
    });

    it('śmieci nie wywracają odczytu', () => {
        expect(odczytajSloty(null)).toEqual([]);
        expect(odczytajSloty(undefined)).toEqual([]);
        expect(odczytajSloty({ error: 'Rate limited' })).toEqual([]);
        expect(odczytajSloty('nie-json')).toEqual([]);
    });

    it('odrzuca wpisy bez sensownego `start`', () => {
        expect(odczytajSloty([{ start: '2026-10-12' }, { doctorName: 'X' }, null, slot('2026-10-12T10:00:00')]))
            .toHaveLength(1);
    });
});

describe('godzinaSlotu', () => {
    it('🔴 czyta godzinę z pola `start` (nie z nieistniejącego `time`/`startTime`)', () => {
        expect(godzinaSlotu(slot('2026-10-12T10:00:00'))).toBe('10:00');
        expect(godzinaSlotu(slot('2026-10-12T13:30:00'))).toBe('13:30');
    });

    it('🪤 tnie STRING, więc nie przesuwa godziny przez strefę serwera (UTC)', () => {
        // Gdyby przejść przez `new Date(...)` i sformatować ze strefą, w części roku
        // wyszłoby 09:00 albo 11:00 zamiast 10:00 — i tylko w części roku.
        expect(godzinaSlotu(slot('2026-01-12T10:00:00'))).toBe('10:00'); // czas zimowy
        expect(godzinaSlotu(slot('2026-07-12T10:00:00'))).toBe('10:00'); // czas letni
    });
});

describe('podsumujDzienPoLekarzach', () => {
    it('grupuje po lekarzu i podaje realne godziny', () => {
        const out = podsumujDzienPoLekarzach([
            slot('2026-10-12T10:00:00', 'Elżbieta Nowosielska'),
            slot('2026-10-12T10:30:00', 'Elżbieta Nowosielska'),
            slot('2026-10-12T09:00:00', 'Marcin Nowosielski'),
        ]);
        expect(out).toContain('- Elżbieta Nowosielska: 10:00, 10:30');
        expect(out).toContain('- Marcin Nowosielski: 09:00');
        expect(out).not.toContain('undefined');
    });

    it('ucina długie listy i mówi, ile zostało', () => {
        const sloty = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00']
            .map(g => slot(`2026-10-12T${g}:00`, 'Ilona Piechaczek'));
        expect(podsumujDzienPoLekarzach(sloty)).toBe('  - Ilona Piechaczek: 09:00, 09:30, 10:00, 10:30, 11:00 (+2 więcej)');
    });

    it('bez slotów zwraca pusty string — wołający pomija dzień', () => {
        expect(podsumujDzienPoLekarzach([])).toBe('');
    });

    it('slot bez nazwiska lekarza nie gubi godziny', () => {
        expect(podsumujDzienPoLekarzach([slot('2026-10-12T08:00:00')])).toBe('  - Nieprzypisany: 08:00');
    });
});

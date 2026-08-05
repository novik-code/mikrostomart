/**
 * Strażnik siatki dawkowania PRZY PRZEŁOŻENIU ZABIEGU.
 *
 * ZNALEZIONE 2026-08-05. Trasa PUT /api/employee/careflow/enrollments/[id] przy zmianie
 * godziny zabiegu przesuwała WSZYSTKIE zadania surową deltą i ponownie snapowała wyłącznie
 * kroki z `smart_snap`. Kroki lekowe mają `smart_snap = false` (ich termin jest kliniczny),
 * więc dawki schodziły z siatki 07/15/23:
 *
 *   zabieg 11:00 → dawka nasycająca 23:00 dnia poprzedniego
 *   przełożenie na 13:00 (delta +2 h) → ta sama dawka ląduje o 01:00
 *
 * 01:00 leży w oknie ciszy crona `careflow-push` (00:00–07:00), więc pacjent NIE DOSTAŁBY
 * o tej dawce żadnego przypomnienia. Zadanie by istniało, powiadomienie nie.
 *
 * Naprawa: kroki z `dose_snap` przeliczamy od NOWEJ godziny zabiegu tym samym rachunkiem
 * co planista — snapujemy KOTWICĘ (dawkę 0), kolejne odmierzamy stałym odstępem.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DOSE_GRID_HOURS, snapToDoseGrid, warsawIso, type DoseSnapMode } from '../careflowSchedule';

const HOUR_MS = 60 * 60 * 1000;

/** Godzina ścienna w Warszawie. */
const warsawHour = (d: Date): number =>
    Number(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Warsaw',
            hourCycle: 'h23',
            hour: '2-digit',
        }).format(d)
    );

/**
 * Rachunek przeniesiony 1:1 z trasy przekładania zabiegu. Gdyby tam się rozjechał,
 * ten test przestaje odpowiadać rzeczywistości — dlatego niżej stoi też strażnik okablowania.
 */
function rescheduleDose(
    mode: DoseSnapMode,
    newProcedure: Date,
    stepOffsetHours: number,
    intervalHours: number,
    originalOffsetHours: number
): Date {
    const anchorMs = snapToDoseGrid(
        mode,
        newProcedure,
        new Date(newProcedure.getTime() + stepOffsetHours * HOUR_MS)
    ).getTime();
    const doseIndex =
        intervalHours > 0
            ? Math.max(0, Math.round((originalOffsetHours - stepOffsetHours) / intervalHours))
            : 0;
    return new Date(anchorMs + doseIndex * intervalHours * HOUR_MS);
}

const proc = (day: string, time: string) => new Date(warsawIso(`2026-09-${day}`, time));

describe('przełożenie zabiegu nie zsuwa dawek z siatki', () => {
    const OFFSET = 4; // pierwsza dawka po zabiegu
    const INTERVAL = 8; // co 8 h
    const DOSES = [0, 1, 2, 3, 4, 5].map((i) => OFFSET + i * INTERVAL);

    it('każda dawka ląduje na 07/15/23 po przesunięciu o 2 h', () => {
        const moved = proc('15', '13:00'); // zabieg przełożony z 11:00
        for (const original of DOSES) {
            const when = rescheduleDose('grid', moved, OFFSET, INTERVAL, original);
            expect(DOSE_GRID_HOURS).toContain(warsawHour(when) as 7 | 15 | 23);
        }
    });

    it('trzyma się siatki dla całej doby możliwych godzin zabiegu', () => {
        for (let h = 0; h < 24; h++) {
            const moved = proc('15', `${String(h).padStart(2, '0')}:00`);
            for (const original of DOSES) {
                const when = rescheduleDose('grid', moved, OFFSET, INTERVAL, original);
                expect(DOSE_GRID_HOURS).toContain(warsawHour(when) as 7 | 15 | 23);
            }
        }
    });

    it('dawka nasycająca nie wpada w okno ciszy crona (00:00–07:00)', () => {
        // To jest dokładnie ten przypadek, który gubił przypomnienie.
        for (let h = 0; h < 24; h++) {
            const moved = proc('15', `${String(h).padStart(2, '0')}:00`);
            const loading = rescheduleDose('loading', moved, -8, 0, -8);
            expect(warsawHour(loading)).toBeGreaterThanOrEqual(7);
        }
    });

    it('zachowuje kolejność dawek (żadna nie wyprzedza poprzedniej)', () => {
        const moved = proc('15', '13:00');
        const times = DOSES.map((o) => rescheduleDose('grid', moved, OFFSET, INTERVAL, o).getTime());
        for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
    });

    it('SUROWA DELTA — sposób sprzed naprawy — siatki NIE utrzymuje', () => {
        // Kontrola negatywna: dowód, że stary rachunek naprawdę był zły.
        const before = proc('15', '11:00');
        const anchor = snapToDoseGrid('grid', before, new Date(before.getTime() + OFFSET * HOUR_MS));
        const shifted = new Date(anchor.getTime() + 2 * HOUR_MS); // przełożenie o 2 h
        expect(DOSE_GRID_HOURS).not.toContain(warsawHour(shifted) as 7 | 15 | 23);
    });
});

describe('trasa przekładania realnie używa siatki', () => {
    const src = fs.readFileSync(
        path.join(process.cwd(), 'src/app/api/employee/careflow/enrollments/[id]/route.ts'),
        'utf8'
    );

    it('pobiera dose_snap ze zdefiniowanych kroków', () => {
        expect(src).toMatch(/select\('id, smart_snap, dose_snap, offset_hours, recurrence_interval_hours'\)/);
    });

    it('pobiera original_offset_hours zadania (numer dawki)', () => {
        expect(src).toMatch(/original_offset_hours/);
    });

    it('przelicza kroki lekowe przez snapToDoseGrid, a nie samą deltą', () => {
        expect(src).toMatch(/snapToDoseGrid\(/);
    });

    it('dose_snap ma pierwszeństwo przed smart_snap', () => {
        // smartSnap wolno wołać dopiero w gałęzi `else` — inaczej strażnik ciszy
        // zepchnąłby dawkę 23:00 na 22:00 i znów zeszłaby z siatki.
        expect(src).toMatch(/\} else if \(snapByStep\.get\(task\.step_id\)\) \{/);
    });
});

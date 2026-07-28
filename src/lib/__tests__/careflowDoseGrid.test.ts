import { describe, expect, it } from 'vitest';
import {
    DOSE_GRID_HOURS,
    buildTasks,
    gridFloor,
    gridNext,
    snapToDoseGrid,
    warsawIso,
    type CareStepRow,
} from '../careflowSchedule';

/** Ściana zegara w Warszawie dla momentu — do czytelnych asercji. */
function warsawHM(d: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Warsaw',
        hourCycle: 'h23',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
        .format(d)
        .replace(',', '');
}

const proc = (day: string, time: string) => new Date(warsawIso(`2026-09-${day}`, time));

describe('siatka dawkowania 07/15/23', () => {
    it('ma odstęp dokładnie 8 h — inaczej krok „co 8 h" zszedłby z siatki', () => {
        const [a, b, c] = DOSE_GRID_HOURS;
        expect(b - a).toBe(8);
        expect(c - b).toBe(8);
        expect(24 - c + a).toBe(8);
    });

    it('gridFloor obcina minuty do slotu, gridNext idzie ŚCIŚLE dalej', () => {
        expect(warsawHM(gridFloor(proc('15', '07:30')))).toBe('15 07:00');
        expect(warsawHM(gridFloor(proc('15', '07:00')))).toBe('15 07:00');
        expect(warsawHM(gridNext(proc('15', '07:00')))).toBe('15 15:00');
        expect(warsawHM(gridNext(proc('15', '23:10')))).toBe('16 07:00');
    });

    it('gridFloor przed pierwszym slotem doby cofa na 23:00 dnia poprzedniego', () => {
        expect(warsawHM(gridFloor(proc('15', '01:00')))).toBe('14 23:00');
    });
});

/**
 * Cztery przypadki podane wprost przez lekarza. To jest kontrakt tej funkcji —
 * jeśli któryś przestanie się zgadzać, protokół rozjeżdża się z ordynacją.
 */
describe('przykłady lekarza — dawka nasycająca, tuż przed, pierwsza po zabiegu', () => {
    const CASES: Array<{ at: string; loading: string; preOp: string; firstAfter: string }> = [
        { at: '09:00', loading: '14 23:00', preOp: '15 07:00', firstAfter: '15 15:00' },
        { at: '11:00', loading: '14 23:00', preOp: '15 07:00', firstAfter: '15 15:00' },
        { at: '13:00', loading: '14 23:00', preOp: '15 07:00', firstAfter: '15 15:00' },
        { at: '15:00', loading: '15 07:00', preOp: '15 14:00', firstAfter: '15 23:00' },
    ];

    for (const c of CASES) {
        it(`zabieg ${c.at}`, () => {
            const p = proc('15', c.at);
            expect(warsawHM(snapToDoseGrid('loading', p, p))).toBe(c.loading);
            expect(warsawHM(snapToDoseGrid('pre_op', p, p))).toBe(c.preOp);
            expect(warsawHM(snapToDoseGrid('grid', p, p))).toBe(c.firstAfter);
        });
    }

    it('przy zabiegu o 15:00 dawka „tuż przed" NIE zbiega się z nasycającą', () => {
        const p = proc('15', '15:00');
        expect(snapToDoseGrid('pre_op', p, p).getTime()).not.toBe(
            snapToDoseGrid('loading', p, p).getTime()
        );
    });

    it('odstęp wolno SKRÓCIĆ, nie wydłużyć: lek o 10:00 → następna dawka 15:00', () => {
        const p = proc('15', '11:00');
        const taken = proc('15', '10:00');
        expect(warsawHM(snapToDoseGrid('grid', p, taken))).toBe('15 15:00');
    });
});

describe('buildTasks z siatką', () => {
    const step = (over: Partial<CareStepRow>): CareStepRow => ({
        id: over.id ?? 'step-1',
        title: over.title ?? 'Lek',
        offset_hours: over.offset_hours ?? 0,
        ...over,
    });

    it('dawki podtrzymujące co 8 h zostają na siatce', () => {
        const tasks = buildTasks({
            steps: [
                step({
                    id: 'maint',
                    offset_hours: 0,
                    dose_snap: 'grid',
                    is_recurring: true,
                    recurrence_count: 4,
                    recurrence_interval_hours: 8,
                }),
            ],
            medications: [],
            appointmentDate: proc('15', '11:00'),
        });
        const hours = tasks.map((t) => warsawHM(new Date(t.scheduled_at)));
        expect(hours).toEqual(['15 15:00', '15 23:00', '16 07:00', '16 15:00']);
    });

    /**
     * Zabieg o 15:00 → pierwsza dawka podtrzymująca wypada na slot 23:00.
     * `smartSnap` (22–07) zepchnąłby ją na 22:00 i rozjechał z ordynacją —
     * dlatego `dose_snap` ma nad nim pierwszeństwo.
     */
    it('dose_snap wygrywa ze smart_snap — dawka 23:00 NIE jest spychana na 22:00', () => {
        const tasks = buildTasks({
            steps: [step({ id: 'night', offset_hours: 0, dose_snap: 'grid', smart_snap: true })],
            medications: [],
            appointmentDate: proc('15', '15:00'),
        });
        expect(warsawHM(new Date(tasks[0].scheduled_at))).toBe('15 23:00');
    });

    /** Kontrola przeciwna: ten sam krok BEZ `dose_snap` faktycznie zostaje przesunięty. */
    it('sam smart_snap nadal spycha nocny termin (dowód, że test wyżej coś mierzy)', () => {
        const tasks = buildTasks({
            steps: [step({ id: 'night2', offset_hours: 8, smart_snap: true })],
            medications: [],
            appointmentDate: proc('15', '15:00'),
        });
        expect(warsawHM(new Date(tasks[0].scheduled_at))).toBe('15 22:00');
    });

    it('krok bez dose_snap zachowuje dotychczasowe zachowanie (regresja)', () => {
        const tasks = buildTasks({
            steps: [step({ id: 'plain', offset_hours: 3 })],
            medications: [],
            appointmentDate: proc('15', '11:00'),
        });
        expect(warsawHM(new Date(tasks[0].scheduled_at))).toBe('15 14:00');
    });
});

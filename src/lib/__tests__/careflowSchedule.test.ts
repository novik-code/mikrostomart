import { describe, it, expect } from 'vitest';
import { buildTasks, smartSnap, warsawIso, PAST_DUE_NOTE, type CareStepRow } from '../careflowSchedule';

/**
 * Harmonogram CareFlow. Testy są celowo w 100% deterministyczne — żadnego
 * `new Date()` bez argumentu — bo cała wartość tej warstwy polega na tym, że
 * ten sam zabieg daje ten sam plan niezależnie od strefy serwera (Vercel = UTC)
 * i pory uruchomienia.
 */

const snapIso = (iso: string, quietStart?: number, quietEnd?: number) =>
    smartSnap(new Date(iso), quietStart, quietEnd).toISOString();

describe('smartSnap', () => {
    it('moves a night-time task to the morning boundary', () => {
        // 02:30 czasu warszawskiego → 07:00 tego samego dnia
        expect(snapIso('2026-07-28T02:30:00+02:00')).toBe('2026-07-28T05:00:00.000Z');
    });

    it('pulls a late-evening task back to the quiet-hours start', () => {
        expect(snapIso('2026-07-28T23:47:00+02:00')).toBe('2026-07-28T20:00:00.000Z');
    });

    it('treats quietStart as inclusive (22:00 snaps to a full 22:00)', () => {
        // 22:00:30 → 22:00:00 (minuty i sekundy zerowane)
        expect(snapIso('2026-07-28T22:00:30+02:00')).toBe('2026-07-28T20:00:00.000Z');
    });

    it('treats quietEnd as exclusive (07:00 stays untouched, 06:59 snaps)', () => {
        expect(snapIso('2026-07-28T07:00:00+02:00')).toBe('2026-07-28T05:00:00.000Z');
        expect(snapIso('2026-07-28T06:59:00+02:00')).toBe('2026-07-28T05:00:00.000Z');
        // 07:00 nie jest przesuwane, więc minuty zostają nienaruszone
        expect(snapIso('2026-07-28T07:12:00+02:00')).toBe('2026-07-28T05:12:00.000Z');
    });

    it('leaves midday alone, keeping minutes intact', () => {
        expect(snapIso('2026-07-28T12:34:00+02:00')).toBe('2026-07-28T10:34:00.000Z');
    });

    it('uses Warsaw hours, not the server clock (regression: getHours() on a UTC server)', () => {
        // 21:30 UTC = 23:30 w Polsce → cisza nocna. Serwer w UTC widział 21 i nie robił nic.
        expect(snapIso('2026-07-28T21:30:00Z')).toBe('2026-07-28T20:00:00.000Z');
    });

    it('uses the Warsaw calendar day when UTC is still on the previous day', () => {
        // 23:30 UTC 28.07 = 01:30 dnia 29.07 w Polsce → 07:00 dnia 29.07
        expect(snapIso('2026-07-28T23:30:00Z')).toBe('2026-07-29T05:00:00.000Z');
    });

    it('handles winter time (+01:00)', () => {
        // 05:00 UTC = 06:00 w Polsce → 07:00 = 06:00 UTC
        expect(snapIso('2026-01-15T05:00:00Z')).toBe('2026-01-15T06:00:00.000Z');
    });

    it('snaps across the spring DST switch using the target-hour offset', () => {
        // 00:30 UTC 29.03 = 01:30 CET (+01:00); 07:00 tego dnia to już CEST (+02:00) = 05:00 UTC.
        // Naiwne dodanie różnicy godzin dałoby 06:30 UTC (czyli 08:30 w Polsce).
        expect(snapIso('2026-03-29T00:30:00Z')).toBe('2026-03-29T05:00:00.000Z');
    });

    it('snaps across the autumn DST switch', () => {
        // 03:00 UTC 25.10 = 04:00 CET (+01:00) → 07:00 CET = 06:00 UTC
        expect(snapIso('2026-10-25T03:00:00Z')).toBe('2026-10-25T06:00:00.000Z');
    });

    it('respects custom quiet hours from the template', () => {
        // 22:30 mieści się w oknie 06:00-23:00 → bez zmian
        expect(snapIso('2026-07-28T22:30:00+02:00', 23, 6)).toBe('2026-07-28T20:30:00.000Z');
        // 05:30 jest przed 06:00 → przesunięcie na 06:00
        expect(snapIso('2026-07-28T05:30:00+02:00', 23, 6)).toBe('2026-07-28T04:00:00.000Z');
    });

    it('does not mutate the input date', () => {
        const input = new Date('2026-07-28T02:30:00+02:00');
        smartSnap(input);
        expect(input.toISOString()).toBe('2026-07-28T00:30:00.000Z');
    });
});

describe('warsawIso', () => {
    it('emits +02:00 in summer', () => {
        expect(warsawIso('2026-07-27', '15:30')).toBe('2026-07-27T15:30:00+02:00');
        expect(new Date(warsawIso('2026-07-27', '15:30')).toISOString()).toBe('2026-07-27T13:30:00.000Z');
    });

    it('emits +01:00 in winter', () => {
        expect(warsawIso('2026-01-15', '15:30')).toBe('2026-01-15T15:30:00+01:00');
        expect(new Date(warsawIso('2026-01-15', '15:30')).toISOString()).toBe('2026-01-15T14:30:00.000Z');
    });

    it('picks the right side of the DST switch', () => {
        // 29.03.2026 przejście o 02:00 CET → 03:00 CEST
        expect(warsawIso('2026-03-29', '01:00')).toBe('2026-03-29T01:00:00+01:00');
        expect(warsawIso('2026-03-29', '15:30')).toBe('2026-03-29T15:30:00+02:00');
        // 25.10.2026 powrót na czas zimowy
        expect(warsawIso('2026-10-25', '15:30')).toBe('2026-10-25T15:30:00+01:00');
    });

    it('pads single-digit hours from Prodentis', () => {
        expect(warsawIso('2026-07-27', '9:05')).toBe('2026-07-27T09:05:00+02:00');
    });
});

// ── buildTasks ──────────────────────────────────────────────

/** Zabieg 27.07.2026 15:30 czasu polskiego = 13:30 UTC. */
const APPOINTMENT = new Date('2026-07-27T15:30:00+02:00');

function step(overrides: Partial<CareStepRow> & { id: string }): CareStepRow {
    return { title: 'Krok', offset_hours: 0, ...overrides };
}

describe('buildTasks — recurrence', () => {
    const recurringStep = step({
        id: 'step-antybiotyk',
        title: 'Weź antybiotyk',
        offset_hours: 2,
        is_recurring: true,
        recurrence_count: 6,
        recurrence_interval_hours: 8,
    });

    it('expands a recurring step into N tasks spaced by the interval', () => {
        const tasks = buildTasks({ steps: [recurringStep], medications: [], appointmentDate: APPOINTMENT });

        expect(tasks).toHaveLength(6);
        expect(tasks.map((t) => t.scheduled_at)).toEqual([
            '2026-07-27T15:30:00.000Z',
            '2026-07-27T23:30:00.000Z',
            '2026-07-28T07:30:00.000Z',
            '2026-07-28T15:30:00.000Z',
            '2026-07-28T23:30:00.000Z',
            '2026-07-29T07:30:00.000Z',
        ]);
        expect(tasks.map((t) => t.original_offset_hours)).toEqual([2, 10, 18, 26, 34, 42]);
        // wszystkie dawki dziedziczą krok źródłowy
        expect(tasks.every((t) => t.step_id === 'step-antybiotyk')).toBe(true);
    });

    it('numbers the doses in the title', () => {
        const tasks = buildTasks({ steps: [recurringStep], medications: [], appointmentDate: APPOINTMENT });
        expect(tasks[0].title).toBe('Weź antybiotyk (dawka 1/6)');
        expect(tasks[5].title).toBe('Weź antybiotyk (dawka 6/6)');
    });

    it('does not duplicate the counter when the title already mentions a dose', () => {
        const tasks = buildTasks({
            steps: [step({ id: 's', title: 'Antybiotyk — dawka wieczorna', offset_hours: 2, is_recurring: true, recurrence_count: 3, recurrence_interval_hours: 8 })],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        expect(tasks).toHaveLength(3);
        expect(tasks.every((t) => t.title === 'Antybiotyk — dawka wieczorna')).toBe(true);
    });

    it('ignores recurrence_count when is_recurring is not set', () => {
        const tasks = buildTasks({
            steps: [step({ id: 's', offset_hours: 2, recurrence_count: 6, recurrence_interval_hours: 8 })],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        expect(tasks).toHaveLength(1);
    });

    it('always produces at least one task for a recurring step with a zero count', () => {
        const tasks = buildTasks({
            steps: [step({ id: 's', offset_hours: 2, is_recurring: true, recurrence_count: 0, recurrence_interval_hours: 8 })],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        expect(tasks).toHaveLength(1);
        expect(tasks[0].original_offset_hours).toBe(2);
    });

    it('smart-snaps every dose separately', () => {
        const tasks = buildTasks({
            steps: [step({ id: 's', title: 'Płukanka', offset_hours: 8, is_recurring: true, recurrence_count: 3, recurrence_interval_hours: 6, smart_snap: true })],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        // 23:30 → 22:00; 05:30 → 07:00; 11:30 bez zmian (godziny polskie)
        expect(tasks.map((t) => t.scheduled_at)).toEqual([
            '2026-07-27T20:00:00.000Z',
            '2026-07-28T05:00:00.000Z',
            '2026-07-28T09:30:00.000Z',
        ]);
    });
});

describe('buildTasks — push settings', () => {
    it('keeps a zero reminder count instead of falling back to 6 (regression: || vs ??)', () => {
        const tasks = buildTasks({
            steps: [step({ id: 's', title: 'Przyjedź na zabieg', offset_hours: -2, reminder_max_count: 0, reminder_interval_minutes: 0 })],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        expect(tasks[0].push_max_count).toBe(0);
        expect(tasks[0].push_interval_minutes).toBe(0);
    });

    it('falls back to the defaults only when the step has no value', () => {
        const tasks = buildTasks({
            steps: [step({ id: 's', offset_hours: 1 })],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        expect(tasks[0].push_max_count).toBe(6);
        expect(tasks[0].push_interval_minutes).toBe(30);
    });

    it('copies push_message from the step (regression: it was dropped on save)', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'a', offset_hours: 1, push_message: 'Czas na kolejny krok opieki' }),
                step({ id: 'b', offset_hours: 2 }),
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        expect(tasks[0].push_message).toBe('Czas na kolejny krok opieki');
        expect(tasks[1].push_message).toBeNull();
    });

    it('keeps requires_confirmation false instead of forcing true', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'a', offset_hours: 1, requires_confirmation: false }),
                step({ id: 'b', offset_hours: 2 }),
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
        });
        expect(tasks[0].requires_confirmation).toBe(false);
        expect(tasks[1].requires_confirmation).toBe(true);
    });
});

describe('buildTasks — ordering', () => {
    it('numbers sort_order chronologically and uniquely, regardless of input order', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'kontrola', sort_order: 3, offset_hours: 168 }),
                step({ id: 'przypomnienie', sort_order: 1, offset_hours: -24 }),
                step({ id: 'antybiotyk', sort_order: 2, offset_hours: 4, is_recurring: true, recurrence_count: 3, recurrence_interval_hours: 8 }),
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
        });

        expect(tasks.map((t) => t.sort_order)).toEqual([1, 2, 3, 4, 5]);
        expect(tasks.map((t) => t.step_id)).toEqual(['przypomnienie', 'antybiotyk', 'antybiotyk', 'antybiotyk', 'kontrola']);

        const times = tasks.map((t) => new Date(t.scheduled_at).getTime());
        expect(times).toEqual([...times].sort((a, b) => a - b));
        expect(new Set(tasks.map((t) => t.sort_order)).size).toBe(tasks.length);
    });

    it('spreads snap collisions by 5 minutes instead of stacking them on one moment', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'a', offset_hours: 10, smart_snap: true }),
                step({ id: 'b', offset_hours: 12, smart_snap: true }),
                step({ id: 'c', offset_hours: 14, smart_snap: true }),
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
        });

        // 01:30, 03:30 i 05:30 czasu polskiego snapują się na 07:00 → 07:00 / 07:05 / 07:10
        expect(tasks.map((t) => t.scheduled_at)).toEqual([
            '2026-07-28T05:00:00.000Z',
            '2026-07-28T05:05:00.000Z',
            '2026-07-28T05:10:00.000Z',
        ]);
        expect(tasks.map((t) => t.step_id)).toEqual(['a', 'b', 'c']);
    });
});

describe('buildTasks — medications and visibility', () => {
    const medications = [
        { name: 'Amoksycylina', dose: '1000 mg', description: 'Popić szklanką wody', frequency: 'co 8 h' },
        { name: 'Ibuprom', dose: '400 mg', description: 'W razie bólu, co 8 h', frequency: 'co 8 h' },
        { name: 'Nurofen', dose: '200 mg', frequency: 'co 12 h' },
    ];

    it('snapshots the medication pointed at by medication_index', () => {
        const tasks = buildTasks({
            steps: [step({ id: 's', offset_hours: 1, medication_index: 0 })],
            medications,
            appointmentDate: APPOINTMENT,
        });
        expect(tasks[0].medication_name).toBe('Amoksycylina');
        expect(tasks[0].medication_dose).toBe('1000 mg');
    });

    it('appends the dosing frequency so it does not get lost on save', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'a', offset_hours: 1, medication_index: 0 }),
                step({ id: 'b', offset_hours: 2, medication_index: 1 }),
                step({ id: 'c', offset_hours: 3, medication_index: 2 }),
            ],
            medications,
            appointmentDate: APPOINTMENT,
        });
        expect(tasks[0].medication_description).toBe('Popić szklanką wody (co 8 h)');
        // opis już zawiera częstotliwość → bez dublowania
        expect(tasks[1].medication_description).toBe('W razie bólu, co 8 h');
        // brak opisu → sama częstotliwość
        expect(tasks[2].medication_description).toBe('co 12 h');
    });

    it('leaves medication fields empty for steps without a medication', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'a', offset_hours: 1 }),
                // indeks poza snapshotem leków (np. lekarz skrócił listę)
                step({ id: 'b', offset_hours: 2, medication_index: 9 }),
            ],
            medications,
            appointmentDate: APPOINTMENT,
        });
        expect(tasks[0].medication_name).toBeNull();
        expect(tasks[0].medication_description).toBeNull();
        expect(tasks[1].medication_name).toBeNull();
    });

    it('derives visible_from from visible_hours_before, including the dedupe shift', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'a', offset_hours: 1, visible_hours_before: 2 }),
                step({ id: 'b', offset_hours: 2 }),
                step({ id: 'c', offset_hours: 10, smart_snap: true, visible_hours_before: 1 }),
                step({ id: 'd', offset_hours: 12, smart_snap: true, visible_hours_before: 1 }),
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
        });

        expect(tasks[0].visible_from).toBe('2026-07-27T12:30:00.000Z'); // 14:30 → 2 h wcześniej
        expect(tasks[1].visible_from).toBeNull();
        expect(tasks[2].visible_from).toBe('2026-07-28T04:00:00.000Z'); // 07:00 PL − 1 h
        expect(tasks[3].visible_from).toBe('2026-07-28T04:05:00.000Z'); // 07:05 PL − 1 h
    });
});

describe('buildTasks — zaległe kroki (now)', () => {
    /** Kroki typowego protokołu antybiotykowego: recepta, 2 dawki przed zabiegiem, przyjazd, dawka po. */
    const preOpSteps = [
        step({ id: 'recepta', sort_order: 1, title: 'Wykup receptę', offset_hours: -24, description: 'Apteka całodobowa przy klinice' }),
        step({ id: 'dawka-1', sort_order: 2, title: 'Weź antybiotyk dawka 1', offset_hours: -16 }),
        step({ id: 'dawka-2', sort_order: 3, title: 'Weź antybiotyk dawka 2', offset_hours: -8 }),
        step({ id: 'przyjazd', sort_order: 4, title: 'Przyjedź na zabieg', offset_hours: -1 }),
        step({ id: 'dawka-3', sort_order: 5, title: 'Weź antybiotyk dawka 3', offset_hours: 2 }),
    ];

    it('marks steps whose time already passed as skipped when the protocol is accepted 3 h before the procedure', () => {
        // Zabieg 27.07 15:30 PL, lekarz akceptuje propozycję o 12:30 PL (10:30 UTC).
        const tasks = buildTasks({
            steps: preOpSteps,
            medications: [],
            appointmentDate: APPOINTMENT,
            now: new Date('2026-07-27T12:30:00+02:00'),
        });

        expect(tasks.map((t) => t.step_id)).toEqual(['recepta', 'dawka-1', 'dawka-2', 'przyjazd', 'dawka-3']);
        // −24 h / −16 h / −8 h są w przeszłości → zamknięte od razu; −1 h i +2 h zostają aktywne
        expect(tasks.map((t) => t.skipped_at)).toEqual([
            '2026-07-27T10:30:00.000Z',
            '2026-07-27T10:30:00.000Z',
            '2026-07-27T10:30:00.000Z',
            null,
            null,
        ]);
    });

    it('annotates a skipped task so the patient does not take the dose on their own', () => {
        const tasks = buildTasks({
            steps: preOpSteps,
            medications: [],
            appointmentDate: APPOINTMENT,
            now: new Date('2026-07-27T12:30:00+02:00'),
        });

        // opis kroku zostaje, dopisek idzie w nowej linii
        expect(tasks[0].description).toBe(`Apteka całodobowa przy klinice\n${PAST_DUE_NOTE}`);
        // krok bez opisu dostaje sam dopisek (bez pustej pierwszej linii)
        expect(tasks[1].description).toBe(PAST_DUE_NOTE);
        // aktywne zadania są nietknięte
        expect(tasks[3].description).toBeNull();
        expect(tasks[4].description).toBeNull();
    });

    it('keeps sort_order continuous — a skipped task still occupies its slot', () => {
        const tasks = buildTasks({
            steps: preOpSteps,
            medications: [],
            appointmentDate: APPOINTMENT,
            now: new Date('2026-07-27T12:30:00+02:00'),
        });

        expect(tasks.map((t) => t.sort_order)).toEqual([1, 2, 3, 4, 5]);
        // terminy pominiętych zadań są realne (przeszłe), a nie wyzerowane
        expect(tasks.map((t) => t.scheduled_at)).toEqual([
            '2026-07-26T13:30:00.000Z',
            '2026-07-26T21:30:00.000Z',
            '2026-07-27T05:30:00.000Z',
            '2026-07-27T12:30:00.000Z',
            '2026-07-27T15:30:00.000Z',
        ]);
    });

    it('applies the 2 h grace period: a 1 h slip stays active, a 5 h backlog is skipped', () => {
        // now = 15:30 PL (13:30 UTC) → granica zaległości 13:30 PL (11:30 UTC)
        const tasks = buildTasks({
            steps: [
                step({ id: 'zalegly', offset_hours: -5 }), // 10:30 PL — 5 h w przeszłości
                step({ id: 'graniczny', offset_hours: -2 }), // 13:30 PL — dokładnie na granicy łaski
                step({ id: 'poslizg', offset_hours: -1 }), // 14:30 PL — 1 h w przeszłości
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
            now: APPOINTMENT,
        });

        expect(tasks.map((t) => t.step_id)).toEqual(['zalegly', 'graniczny', 'poslizg']);
        expect(tasks.map((t) => t.skipped_at)).toEqual(['2026-07-27T13:30:00.000Z', null, null]);
        expect(tasks.map((t) => t.description)).toEqual([PAST_DUE_NOTE, null, null]);
    });

    it('decides on the post-dedupe time, keeping collision spreading intact', () => {
        // 01:30 / 03:30 / 05:30 PL snapują się na 07:00 PL → 07:00 / 07:05 / 07:10.
        // now = 09:07 PL (07:07 UTC) → granica 07:07 UTC: pierwsze dwa zaległe, trzecie aktywne.
        const tasks = buildTasks({
            steps: [
                step({ id: 'a', offset_hours: 10, smart_snap: true }),
                step({ id: 'b', offset_hours: 12, smart_snap: true }),
                step({ id: 'c', offset_hours: 14, smart_snap: true }),
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
            now: new Date('2026-07-28T09:07:00+02:00'),
        });

        expect(tasks.map((t) => t.scheduled_at)).toEqual([
            '2026-07-28T05:00:00.000Z',
            '2026-07-28T05:05:00.000Z',
            '2026-07-28T05:10:00.000Z',
        ]);
        expect(tasks.map((t) => t.skipped_at)).toEqual([
            '2026-07-28T07:07:00.000Z',
            '2026-07-28T07:07:00.000Z',
            null,
        ]);
        expect(tasks.map((t) => t.sort_order)).toEqual([1, 2, 3]);
    });

    it('leaves everything active when now is not provided (regression: existing call sites)', () => {
        const withoutNow = buildTasks({ steps: preOpSteps, medications: [], appointmentDate: APPOINTMENT });

        expect(withoutNow.every((t) => t.skipped_at === null)).toBe(true);
        expect(withoutNow.every((t) => !(t.description ?? '').includes(PAST_DUE_NOTE))).toBe(true);
        expect(withoutNow[0].description).toBe('Apteka całodobowa przy klinice');
        expect(withoutNow.map((t) => t.sort_order)).toEqual([1, 2, 3, 4, 5]);

        // wynik identyczny jak z `now` sprzed całego harmonogramu
        const beforeEverything = buildTasks({
            steps: preOpSteps,
            medications: [],
            appointmentDate: APPOINTMENT,
            now: new Date('2026-07-20T08:00:00+02:00'),
        });
        expect(beforeEverything).toEqual(withoutNow);
    });

    it('skips a whole recurring block that fell before the save (rescheduled to an earlier slot)', () => {
        const tasks = buildTasks({
            steps: [
                step({ id: 'ab', title: 'Weź antybiotyk', offset_hours: -24, is_recurring: true, recurrence_count: 4, recurrence_interval_hours: 8 }),
            ],
            medications: [],
            appointmentDate: APPOINTMENT,
            now: new Date('2026-07-27T12:30:00+02:00'),
        });

        // dawki: −24 h, −16 h, −8 h (zaległe) i 0 h = 15:30 PL (przyszła)
        expect(tasks.map((t) => t.skipped_at)).toEqual([
            '2026-07-27T10:30:00.000Z',
            '2026-07-27T10:30:00.000Z',
            '2026-07-27T10:30:00.000Z',
            null,
        ]);
        expect(tasks.map((t) => t.title)).toEqual([
            'Weź antybiotyk (dawka 1/4)',
            'Weź antybiotyk (dawka 2/4)',
            'Weź antybiotyk (dawka 3/4)',
            'Weź antybiotyk (dawka 4/4)',
        ]);
    });
});

describe('buildTasks — purity', () => {
    const steps = [
        step({ id: 'a', offset_hours: -24 }),
        step({ id: 'b', offset_hours: 10, smart_snap: true, is_recurring: true, recurrence_count: 3, recurrence_interval_hours: 6 }),
    ];

    it('returns the same plan for the same input', () => {
        const first = buildTasks({ steps, medications: [], appointmentDate: APPOINTMENT });
        const second = buildTasks({ steps, medications: [], appointmentDate: new Date(APPOINTMENT.getTime()) });
        expect(second).toEqual(first);
    });

    it('does not mutate the appointment date or the steps', () => {
        const appointmentDate = new Date('2026-07-27T15:30:00+02:00');
        buildTasks({ steps, medications: [], appointmentDate });
        expect(appointmentDate.toISOString()).toBe('2026-07-27T13:30:00.000Z');
        expect(steps[1].offset_hours).toBe(10);
    });

    it('returns an empty plan for a template without steps', () => {
        expect(buildTasks({ steps: [], medications: [], appointmentDate: APPOINTMENT })).toEqual([]);
    });
});

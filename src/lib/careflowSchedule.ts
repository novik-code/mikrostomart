/**
 * CareFlow — wspólna warstwa generowania harmonogramu.
 *
 * Jedno źródło prawdy dla: enroll (panel personelu), auto-qualify (cron),
 * symulatora i apki mobilnej. Wcześniej ta sama logika istniała w 3 kopiach,
 * z których każda miała inny zestaw błędów:
 * - `date.getHours()` zamiast strefy Europe/Warsaw (na Vercelu serwer chodzi w UTC
 *   → nocne wyciszenie liczyło się o 1-2 h za wcześnie),
 * - `step.reminder_max_count || 6` (krok z 0 przypomnień dostawał 6),
 * - `push_message` kopiowany tylko w symulatorze (starannie napisane treści ginęły),
 * - rekurencja kroków w ogóle nie była uruchamiana,
 * - `sort_order` przepisywany z kroku (rekurencja go dubluje).
 *
 * Cały moduł jest czysty: zero I/O, zero `Date.now()` — czas wchodzi wyłącznie
 * argumentem, więc harmonogram jest w pełni testowalny.
 */

const WARSAW_TZ = 'Europe/Warsaw';
const HOUR_MS = 60 * 60 * 1000;
/** Kolizja po smart-snapie: kolejne zadanie rozsuwamy o 5 minut. */
const DEDUPE_SHIFT_MS = 5 * 60 * 1000;

/**
 * Okres łaski dla zadań z terminem w przeszłości (godziny).
 *
 * Zapis protokołu prawie zawsze wypada kilka-kilkanaście minut po nominalnym
 * terminie pierwszego kroku — takiego poślizgu NIE traktujemy jako zaległości.
 * Dopiero starsze zadania są realnie „przeterminowane".
 */
export const PAST_GRACE_HOURS = 2;

/** Dopisek dla pacjenta przy kroku, którego termin minął jeszcze przed zapisaniem protokołu. */
export const PAST_DUE_NOTE =
    'Termin tego kroku minął przed zapisaniem protokołu — nie wykonuj go samodzielnie, skontaktuj się z lekarzem.';

function withPastDueNote(description: string | null): string {
    const base = description?.trim();
    return base ? `${base}\n${PAST_DUE_NOTE}` : PAST_DUE_NOTE;
}

const warsawFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: WARSAW_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

type WarsawWallClock = { year: number; month: number; day: number; hour: number; minute: number };

/** Ściana zegara w Warszawie dla danego momentu (nie mylić z czasem serwera). */
function warsawWallClock(date: Date): WarsawWallClock {
    const parts = warsawFormatter.formatToParts(date);
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
    return {
        year: part('year'),
        month: part('month'),
        day: part('day'),
        // część wersji ICU zwraca "24" dla północy — normalizujemy
        hour: part('hour') % 24,
        minute: part('minute'),
    };
}

/** Offset Warszawy (pełne godziny: +1 zimą, +2 latem) dla danego momentu. */
function warsawOffsetHours(instant: Date): number {
    let diff = warsawWallClock(instant).hour - instant.getUTCHours();
    if (diff < -12) diff += 24;
    if (diff > 12) diff -= 24;
    return diff;
}

function formatOffset(hours: number): string {
    const sign = hours >= 0 ? '+' : '-';
    return `${sign}${String(Math.abs(hours)).padStart(2, '0')}:00`;
}

/**
 * Składa ISO z jawnym offsetem Warszawy, np. `warsawIso('2026-07-27', '15:30')`
 * → `'2026-07-27T15:30:00+02:00'`.
 *
 * Prodentis podaje datę i godzinę w czasie lokalnym Polski. Bez jawnego offsetu
 * `new Date('2026-07-27T15:30:00')` na serwerze w UTC przesuwa zabieg o 1-2 h,
 * a razem z nim cały harmonogram.
 */
export function warsawIso(dateYYYYMMDD: string, timeHHMM: string): string {
    const [hh = '00', mm = '00'] = String(timeHHMM).split(':');
    const raw = `${dateYYYYMMDD}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
    // 1. przybliżenie: ścianę zegara czytamy jak UTC, żeby poznać offset tego dnia
    const firstGuess = warsawOffsetHours(new Date(`${raw}Z`));
    // 2. iteracja: w dobie zmiany czasu pierwszy strzał potrafi trafić po drugiej stronie przesunięcia
    const offset = warsawOffsetHours(new Date(`${raw}${formatOffset(firstGuess)}`));
    return `${raw}${formatOffset(offset)}`;
}

/**
 * Przesuwa moment poza godziny ciszy — liczone ZAWSZE w strefie Europe/Warsaw.
 *
 * - godzina >= `quietStart` → cofnięcie na `quietStart:00` tego samego dnia,
 * - godzina < `quietEnd` → przesunięcie na `quietEnd:00` tego samego dnia,
 * - w pozostałych przypadkach moment bez zmian (z minutami).
 *
 * „Ten sam dzień" to dzień WARSZAWSKI, nie UTC: 23:30 UTC w lipcu to już 01:30
 * następnego dnia w Polsce i budzik ma trafić na 07:00 tego następnego dnia.
 */
export function smartSnap(date: Date, quietStart = 22, quietEnd = 7): Date {
    const wall = warsawWallClock(date);
    const targetHour = wall.hour >= quietStart ? quietStart : wall.hour < quietEnd ? quietEnd : null;
    if (targetHour === null) return new Date(date);

    const dateStr = `${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')}`;
    return new Date(warsawIso(dateStr, `${String(targetHour).padStart(2, '0')}:00`));
}

/** Lek ze snapshotu protokołu (`care_templates.default_medications` lub nadpisanie przy zapisie). */
export type CareMedication = {
    name?: string;
    dose?: string;
    description?: string;
    frequency?: string;
};

/** Wiersz `care_template_steps`. */
export type CareStepRow = {
    id: string;
    template_id?: string;
    sort_order?: number | null;
    title: string;
    description?: string | null;
    /** Emoji kroku. */
    icon?: string | null;
    /** Ujemne = przed zabiegiem. */
    offset_hours: number;
    smart_snap?: boolean | null;
    push_message?: string | null;
    is_recurring?: boolean | null;
    recurrence_count?: number | null;
    recurrence_interval_hours?: number | null;
    reminder_interval_minutes?: number | null;
    reminder_max_count?: number | null;
    requires_confirmation?: boolean | null;
    /** Indeks 0-based do listy leków protokołu. */
    medication_index?: number | null;
    visible_hours_before?: number | null;
};

/** Wiersz do INSERT-a w `care_tasks` (bez `id` i bez `enrollment_id` — dokłada je wywołujący). */
export type CareTaskRow = {
    step_id: string;
    sort_order: number;
    title: string;
    description: string | null;
    icon: string | null;
    scheduled_at: string;
    original_offset_hours: number;
    push_max_count: number;
    push_interval_minutes: number;
    push_message: string | null;
    medication_name: string | null;
    medication_dose: string | null;
    medication_description: string | null;
    visible_from: string | null;
    requires_confirmation: boolean;
    /**
     * Ustawiane od razu przy generowaniu, gdy termin kroku minął jeszcze przed
     * zapisaniem protokołu (patrz `PAST_GRACE_HOURS`). Zadanie istnieje dla
     * personelu, ale jest zamknięte: cron go nie wyśle (filtruje `skipped_at IS NULL`),
     * a pacjent nie zobaczy go jako „do wzięcia teraz".
     */
    skipped_at?: string | null;
};

type MedicationSnapshot = {
    medication_name: string | null;
    medication_dose: string | null;
    medication_description: string | null;
};

const NO_MEDICATION: MedicationSnapshot = {
    medication_name: null,
    medication_dose: null,
    medication_description: null,
};

function resolveMedication(step: CareStepRow, medications: CareMedication[]): MedicationSnapshot {
    const index = step.medication_index;
    if (index === null || index === undefined) return NO_MEDICATION;
    const med = medications[index];
    if (!med) return NO_MEDICATION;

    let description = med.description ?? null;
    const frequency = med.frequency?.trim();
    // Częstotliwość ("co 8 h") jest osobnym polem leku i bez tego doklejenia ginie przy zapisie.
    if (frequency && !(description ?? '').toLowerCase().includes(frequency.toLowerCase())) {
        description = description ? `${description} (${frequency})` : frequency;
    }

    return {
        medication_name: med.name ?? null,
        medication_dose: med.dose ?? null,
        medication_description: description,
    };
}

function doseTitle(title: string, doseIndex: number, doses: number): string {
    if (doses <= 1) return title;
    // Seedowe protokoły mają „dawkę" już w tytule — nie dublujemy licznika.
    if (/dawka/i.test(title)) return title;
    return `${title} (dawka ${doseIndex + 1}/${doses})`;
}

type TaskDraft = {
    row: Omit<CareTaskRow, 'sort_order' | 'scheduled_at' | 'visible_from'>;
    scheduledMs: number;
    visibleHoursBefore: number | null;
    stepOrder: number;
    doseIndex: number;
    seq: number;
};

/**
 * Rozwija kroki protokołu w konkretne zadania pacjenta.
 *
 * `appointmentDate` to punkt zerowy offsetów (moment zabiegu). Krok z
 * `is_recurring` generuje `recurrence_count` zadań co `recurrence_interval_hours`
 * — dzięki temu „Weź antybiotyk" jest jednym krokiem protokołu, a nie sześcioma
 * klikniętymi ręcznie.
 *
 * `now` (opcjonalne) to moment zapisu protokołu. Podane — zadania, których termin
 * minął dawniej niż `PAST_GRACE_HOURS` przed `now`, powstają OD RAZU POMINIĘTE
 * (`skipped_at = now`). Bez tego akceptacja protokołu 3 h przed zabiegiem tworzy
 * kroki „-24 h / -16 h / -8 h" z terminem w przeszłości, a najbliższy przebieg
 * crona wysyła je wszystkie naraz — pacjent dostaje kilka przypomnień o dawce leku
 * w jednej minucie. Pominięte zadania nadal istnieją (personel widzi, że krok
 * wypadł) i nadal liczą się do numeracji `sort_order` oraz deduplikacji kolizji.
 * Brak `now` = zachowanie jak dotąd (wszystko aktywne).
 */
export function buildTasks(params: {
    steps: CareStepRow[];
    medications: CareMedication[];
    appointmentDate: Date;
    quietStart?: number;
    quietEnd?: number;
    now?: Date;
}): CareTaskRow[] {
    const { steps, appointmentDate, quietStart = 22, quietEnd = 7, now } = params;
    const medications = params.medications ?? [];
    const baseMs = appointmentDate.getTime();

    const drafts: TaskDraft[] = [];
    let seq = 0;

    for (const step of steps ?? []) {
        const doses = step.is_recurring === true ? Math.max(1, step.recurrence_count ?? 1) : 1;
        const intervalHours = step.recurrence_interval_hours ?? 0;
        const medication = resolveMedication(step, medications);

        for (let dose = 0; dose < doses; dose++) {
            const offsetHours = step.offset_hours + dose * intervalHours;
            let scheduled = new Date(baseMs + offsetHours * HOUR_MS);
            if (step.smart_snap) scheduled = smartSnap(scheduled, quietStart, quietEnd);

            drafts.push({
                seq: seq++,
                stepOrder: step.sort_order ?? 0,
                doseIndex: dose,
                scheduledMs: scheduled.getTime(),
                visibleHoursBefore: step.visible_hours_before ?? null,
                row: {
                    step_id: step.id,
                    title: doseTitle(step.title, dose, doses),
                    description: step.description ?? null,
                    icon: step.icon ?? null,
                    original_offset_hours: offsetHours,
                    // ?? a nie || — krok „Przyjedź na zabieg" ma 0 przypomnień i ma tak zostać
                    push_max_count: step.reminder_max_count ?? 6,
                    push_interval_minutes: step.reminder_interval_minutes ?? 30,
                    push_message: step.push_message ?? null,
                    requires_confirmation: step.requires_confirmation ?? true,
                    ...medication,
                },
            });
        }
    }

    // Numerujemy chronologicznie (tie-break: kolejność kroku, potem dawki) — sort_order
    // z kroku nie nadaje się, bo rekurencja i smart-snap potrafią go zdublować.
    drafts.sort(
        (a, b) =>
            a.scheduledMs - b.scheduledMs ||
            a.stepOrder - b.stepOrder ||
            a.doseIndex - b.doseIndex ||
            a.seq - b.seq
    );

    const rows: CareTaskRow[] = [];
    let previousMs = Number.NEGATIVE_INFINITY;

    // Granica zaległości liczona od terminu PO deduplikacji — to on ląduje w `scheduled_at`.
    const pastDueBeforeMs = now ? now.getTime() - PAST_GRACE_HOURS * HOUR_MS : null;
    const skippedAtIso = now ? now.toISOString() : null;

    drafts.forEach((draft, index) => {
        // Kilka nocnych dawek snapuje się na ten sam moment (np. 07:00) — rozsuwamy je,
        // żeby pacjent nie dostał jednego zlepka i żeby kolejność została chronologiczna.
        const scheduledMs = draft.scheduledMs <= previousMs ? previousMs + DEDUPE_SHIFT_MS : draft.scheduledMs;
        previousMs = scheduledMs;

        const isPastDue = pastDueBeforeMs !== null && scheduledMs < pastDueBeforeMs;

        rows.push({
            ...draft.row,
            sort_order: index + 1,
            scheduled_at: new Date(scheduledMs).toISOString(),
            visible_from: draft.visibleHoursBefore
                ? new Date(scheduledMs - draft.visibleHoursBefore * HOUR_MS).toISOString()
                : null,
            description: isPastDue ? withPastDueNote(draft.row.description) : draft.row.description,
            skipped_at: isPastDue ? skippedAtIso : null,
        });
    });

    return rows;
}

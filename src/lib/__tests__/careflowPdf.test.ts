import { describe, it, expect } from 'vitest';
import {
    generateCareflowReport,
    summarizeCareflowCompliance,
    careflowExportBlockReason,
    type CareflowReportTask,
    type CareflowReportAudit,
} from '@/lib/careflowPdf';
import { PAST_DUE_NOTE } from '@/lib/careflowSchedule';

/**
 * Raport CareFlow trafia do dokumentacji medycznej pacjenta (eksport do Prodentisa),
 * więc testujemy dwie rzeczy, które w produkcji milczą, gdy się zepsują:
 *  1. czy PDF w ogóle powstaje (crash kodowania kończył się `errors++` w cronie i pustym
 *     report_pdf_url — próbowanym co noc w kółko, bez alarmu),
 *  2. czy zgodność nie obciąża pacjenta krokami, których system nigdy mu nie wysłał.
 */

function task(over: Partial<CareflowReportTask> & { sort_order: number }): CareflowReportTask {
    return {
        id: `t${over.sort_order}`,
        title: 'Krok',
        scheduled_at: '2026-07-20T09:00:00+02:00',
        ...over,
    };
}

const BASE_DATA = {
    enrollment: {
        id: '11111111-2222-3333-4444-555555555555',
        patient_name: 'Zażółć Gęślą Jaźń',
        patient_id: '0100001711',
        template_name: 'Zabieg chirurgiczny',
        appointment_date: '2026-07-20T09:00:00+02:00',
        doctor_name: 'lek. dent. Marcin Nowosielski',
        enrolled_by: 'gabinet@mikrostomart.pl',
        enrolled_at: '2026-07-19T08:00:00+02:00',
        status: 'completed',
        prescription_code: '1234',
        custom_notes: 'Proszę zgłosić się na czczo — wyłącznie łyk wody.',
    },
    auditLog: [] as CareflowReportAudit[],
};

describe('generateCareflowReport — kodowanie treści z bazy', () => {
    it('składa PDF mimo polskich znaków w tytułach, opisach i nazwiskach', async () => {
        // Dosłowne tytuły z seeda protokołu (migracja 110) — to one wywracały generator:
        // standardowa Helvetica koduje WinAnsi i rzuca 'WinAnsi cannot encode "ę"'.
        const bytes = await generateCareflowReport({
            ...BASE_DATA,
            tasks: [
                task({ sort_order: 1, title: 'Wykup receptę', completed_at: '2026-07-19T10:00:00+02:00' }),
                task({ sort_order: 2, title: 'Weź antybiotyk (dawka 1)', medication_name: 'Amoksycylina', medication_dose: '1 g' }),
                task({ sort_order: 3, title: 'Płucz jamę ustną — chlorheksydyna 0,2%' }),
            ],
        });

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.byteLength).toBeGreaterThan(1000);
    });

    it('składa PDF, gdy krok niesie długą adnotację systemową (zawijanie mierzy szerokość)', async () => {
        const bytes = await generateCareflowReport({
            ...BASE_DATA,
            tasks: [
                task({
                    sort_order: 1,
                    title: 'Weź antybiotyk (dawka 2)',
                    skipped_at: '2026-07-20T13:00:00+02:00',
                    description: `Przyjmij lek zgodnie z zaleceniem.\n${PAST_DUE_NOTE}`,
                }),
            ],
        });

        expect(bytes.byteLength).toBeGreaterThan(1000);
    });
});

describe('summarizeCareflowCompliance — kto pominął krok', () => {
    const audit: CareflowReportAudit[] = [
        { action: 'task_skipped_past_due', actor: 'system', created_at: '2026-07-20T13:00:00+02:00', task_id: 't1' },
    ];

    it('nie wlicza do mianownika kroków zamkniętych przez system', () => {
        const s = summarizeCareflowCompliance(
            [
                task({ sort_order: 1, id: 't1', skipped_at: '2026-07-20T13:00:00+02:00' }),
                task({ sort_order: 2, id: 't2', completed_at: '2026-07-20T18:00:00+02:00' }),
            ],
            audit,
            new Date('2026-07-21T09:00:00+02:00')
        );

        expect(s.skippedBySystem).toBe(1);
        expect(s.skippedByPatient).toBe(0);
        expect(s.asked).toBe(1);
        // Pacjent wykonał wszystko, o co był proszony — 100%, a nie 50%.
        expect(s.compliance).toBe(100);
    });

    it('rozpoznaje adnotację w opisie, gdy brak wpisu audytowego (sygnał zapasowy)', () => {
        const s = summarizeCareflowCompliance(
            [task({ sort_order: 1, id: 'tX', skipped_at: '2026-07-20T13:00:00+02:00', description: PAST_DUE_NOTE })],
            [],
            new Date('2026-07-21T09:00:00+02:00')
        );

        expect(s.skippedBySystem).toBe(1);
        expect(s.signal).toBe('description');
    });

    it('pominięcie bez żadnego sygnału liczy jako decyzję pacjenta', () => {
        const s = summarizeCareflowCompliance(
            [task({ sort_order: 1, id: 't9', skipped_at: '2026-07-20T13:00:00+02:00' })],
            [],
            new Date('2026-07-21T09:00:00+02:00')
        );

        expect(s.skippedByPatient).toBe(1);
        expect(s.skippedBySystem).toBe(0);
    });

    it('przy zerowym mianowniku NIE wystawia oceny zgodności', () => {
        const s = summarizeCareflowCompliance(
            [task({ sort_order: 1, id: 't1', skipped_at: '2026-07-20T13:00:00+02:00' })],
            audit,
            new Date('2026-07-21T09:00:00+02:00')
        );

        expect(s.asked).toBe(0);
        expect(s.compliance).toBeNull();
        // Taki raport to artefakt systemowy — nie wolno go wgrywać do kartoteki.
        expect(careflowExportBlockReason(s)).toBeTruthy();
    });

    it('przepuszcza eksport, gdy pacjent realnie dostał choć jeden krok', () => {
        const s = summarizeCareflowCompliance(
            [
                task({ sort_order: 1, id: 't1', skipped_at: '2026-07-20T13:00:00+02:00' }),
                task({ sort_order: 2, id: 't2', completed_at: '2026-07-20T18:00:00+02:00' }),
            ],
            audit,
            new Date('2026-07-21T09:00:00+02:00')
        );

        expect(careflowExportBlockReason(s)).toBeNull();
    });
});

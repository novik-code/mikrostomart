/**
 * CareFlow PDF Report Generator
 * 
 * Generates professional compliance reports for completed CareFlow enrollments.
 * Uses pdf-lib (already in project dependencies) for serverless PDF generation.
 * 
 * Report contents:
 * - Clinic header with logo placeholder
 * - Patient info, procedure, doctor
 * - Task compliance table (scheduled → completed/skipped, delay)
 * - Medication summary
 * - Compliance score summary
 * - Audit log timeline
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from 'pdf-lib';
import { PAST_DUE_NOTE } from '@/lib/careflowSchedule';

// ── Constants ──────────────────────────────────────────────
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_GOLD = rgb(0.86, 0.69, 0.23); // #dcb14a
const COLOR_GREEN = rgb(0.13, 0.77, 0.37);
const COLOR_RED = rgb(0.87, 0.25, 0.25);
const COLOR_GRAY = rgb(0.5, 0.5, 0.5);
const COLOR_LIGHT_BG = rgb(0.96, 0.96, 0.96);

interface CareflowReportData {
    enrollment: {
        id: string;
        patient_name: string;
        patient_phone?: string;
        patient_id: string;
        template_name: string;
        appointment_date: string;
        doctor_name?: string;
        enrolled_by: string;
        enrolled_at: string;
        completed_at?: string;
        status: string;
        custom_medications?: any;
        prescription_code?: string;
        custom_notes?: string;
    };
    tasks: CareflowReportTask[];
    auditLog: CareflowReportAudit[];
}

export interface CareflowReportTask {
    /** Potrzebne do skorelowania zadania z wpisem audytu 'task_skipped_past_due'. */
    id?: string;
    title: string;
    sort_order: number;
    scheduled_at: string;
    completed_at?: string;
    skipped_at?: string;
    /** Sygnal zapasowy: opis kroku urodzonego pominietym konczy sie PAST_DUE_NOTE. */
    description?: string | null;
    medication_name?: string;
    medication_dose?: string;
}

export interface CareflowReportAudit {
    action: string;
    actor: string;
    created_at: string;
    task_id?: string | null;
    details?: any;
}

/** Akcja audytu zapisywana przy kroku, ktory powstal juz pominiety (termin minal przed startem). */
const PAST_DUE_AUDIT_ACTION = 'task_skipped_past_due';

/** Akcja audytu crona push: krok BYL zywy, przypomnienia poszly, termin minal bez potwierdzenia. */
const EXPIRED_AUDIT_ACTION = 'task_expired';

/**
 * Los pojedynczego kroku widziany przez raport.
 *
 * `skipped_by_system` to NIE jest zaniedbanie pacjenta: taki krok powstal od razu
 * zamkniety, bo jego termin minal jeszcze przed uruchomieniem protokolu. Pacjent
 * nigdy nie dostal o nim przypomnienia i nigdy nie zobaczyl go jako „do zrobienia".
 */
export type CareflowTaskOutcome =
    | 'done'
    | 'skipped_by_patient'
    | 'skipped_by_system'
    | 'pending_due'
    | 'pending_future';

/** Skad wzieto rozroznienie „pominiete przez system" vs „pominiete przez pacjenta". */
export type CareflowSkipSignal = 'audit' | 'description' | 'audit+description' | 'none';

export interface CareflowComplianceSummary {
    /** Wszystkie kroki zapisu. */
    total: number;
    /** Mianownik zgodnosci: kroki, o ktore pacjent realnie byl proszony. */
    asked: number;
    completed: number;
    skippedByPatient: number;
    /** Kroki zamkniete przez system przy tworzeniu protokolu (termin juz minal). */
    skippedBySystem: number;
    /** Otwarte, termin juz minal — pacjent byl proszony, wchodzi do mianownika. */
    pendingDue: number;
    /** Otwarte, termin jeszcze nie nadszedl — poza mianownikiem. */
    pendingFuture: number;
    /** `null`, gdy mianownik jest zerowy — wtedy zgodnosci NIE liczymy. */
    compliance: number | null;
    signal: CareflowSkipSignal;
    /** Los kolejnych krokow, w kolejnosci wejsciowej tablicy `tasks`. */
    outcomes: CareflowTaskOutcome[];
}

const SIGNAL_LABEL: Record<CareflowSkipSignal, string> = {
    audit: `dziennik audytu (${PAST_DUE_AUDIT_ACTION})`,
    description: 'adnotacja w opisie kroku (sygnal zapasowy - brak wpisu w audycie)',
    'audit+description': `dziennik audytu (${PAST_DUE_AUDIT_ACTION}) oraz - dla czesci krokow - zapasowa adnotacja w opisie`,
    none: 'nie dotyczy',
};

/** Zbiera identyfikatory zadan z audytu dla podanej akcji (kolumna `task_id` lub `details`). */
function collectTaskIds(auditLog: CareflowReportAudit[], action: string): Set<string> {
    const ids = new Set<string>();
    for (const row of auditLog ?? []) {
        if (row?.action !== action) continue;
        const details = (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>;
        const rawIds = Array.isArray(details.task_ids) ? details.task_ids : [];
        for (const candidate of [row.task_id, details.task_id, ...rawIds]) {
            if (typeof candidate === 'string' && candidate) ids.add(candidate);
        }
    }
    return ids;
}

/**
 * Rozdziela kroki pominiete PRZEZ SYSTEM od pominietych PRZEZ PACJENTA i liczy
 * zgodnosc wylacznie na tych, o ktore pacjent w ogole byl proszony.
 *
 * Dlaczego to jest krytyczne: recepcja zapisuje pacjenta po zabiegu (normalny
 * grafik), wiec kroki „-24 h / -2 h / 0 h" rodza sie pominiete. Liczone starym
 * wzorem `wykonane / wszystkie` dawaly raport 11/15 = 73% i werdykt „pacjent
 * pominal czesc zalecen" — nieprawde, ktora automat wysylal do kartoteki.
 *
 * Sygnal glowny to wpis audytu `task_skipped_past_due` (jednoznaczny, po `task_id`).
 * Sygnal zapasowy to stala `PAST_DUE_NOTE` doklejana do opisu kroku przez
 * `buildTasks` — ratuje raporty sprzed wprowadzenia wpisu audytowego oraz kroki
 * domkniete przy przekladaniu wizyty. Uzyty sygnal wraca w `signal` i jest
 * drukowany w raporcie.
 *
 * Krok pominiety BEZ zadnego z tych sygnalow liczymy jako pominiety przez pacjenta
 * (np. 'task_expired' — zadanie bylo zywe, przypomnienia poszly, termin minal).
 */
export function summarizeCareflowCompliance(
    tasks: CareflowReportTask[],
    auditLog: CareflowReportAudit[],
    now: Date = new Date()
): CareflowComplianceSummary {
    const pastDueIds = collectTaskIds(auditLog ?? [], PAST_DUE_AUDIT_ACTION);
    // Cron push domyka tylko zadania OTWARTE, wiec 'task_expired' na kroku urodzonym
    // pominietym znaczy, ze personel go w miedzyczasie przywrocil: pacjent dostal
    // przypomnienia i krok wraca do mianownika mimo starego wpisu past-due.
    const expiredIds = collectTaskIds(auditLog ?? [], EXPIRED_AUDIT_ACTION);
    const nowMs = now.getTime();

    let completed = 0;
    let skippedByPatient = 0;
    let skippedBySystem = 0;
    let pendingDue = 0;
    let pendingFuture = 0;
    let usedAudit = false;
    let usedDescription = false;

    const outcomes: CareflowTaskOutcome[] = (tasks ?? []).map((task) => {
        if (task.completed_at) {
            completed++;
            return 'done';
        }

        if (task.skipped_at) {
            const reopened = Boolean(task.id && expiredIds.has(task.id));
            const byAudit = !reopened && Boolean(task.id && pastDueIds.has(task.id));
            const byDescription = !reopened && (task.description ?? '').includes(PAST_DUE_NOTE);
            if (byAudit || byDescription) {
                if (byAudit) usedAudit = true;
                else usedDescription = true;
                skippedBySystem++;
                return 'skipped_by_system';
            }
            skippedByPatient++;
            return 'skipped_by_patient';
        }

        const scheduledMs = new Date(task.scheduled_at).getTime();
        if (Number.isFinite(scheduledMs) && scheduledMs > nowMs) {
            pendingFuture++;
            return 'pending_future';
        }
        pendingDue++;
        return 'pending_due';
    });

    const total = outcomes.length;
    // Mianownik: bez krokow zamknietych przez system i bez krokow, ktorych termin
    // jeszcze nie nadszedl — o zadne z nich pacjent nie byl proszony.
    const asked = total - skippedBySystem - pendingFuture;

    const signal: CareflowSkipSignal =
        usedAudit && usedDescription ? 'audit+description' : usedAudit ? 'audit' : usedDescription ? 'description' : 'none';

    return {
        total,
        asked,
        completed,
        skippedByPatient,
        skippedBySystem,
        pendingDue,
        pendingFuture,
        compliance: asked > 0 ? Math.round((completed / asked) * 100) : null,
        signal,
        outcomes,
    };
}

/**
 * Powod, dla ktorego raport NIE powinien trafic automatem do dokumentacji medycznej.
 * `null` = raport niesie realna tresc o pacjencie i moze isc do kartoteki.
 *
 * Dokumentacja medyczna to nie miejsce na artefakty systemowe: raport bez ani jednego
 * kroku, o ktory pacjenta poproszono, nie mowi nic o pacjencie — mowi tylko o tym,
 * kiedy recepcja klilnela „zapisz".
 */
export function careflowExportBlockReason(summary: CareflowComplianceSummary): string | null {
    if (summary.total === 0) {
        return 'Zapis nie ma zadnego kroku - raport nie zawiera tresci klinicznej.';
    }
    if (summary.asked === 0) {
        return 'Protokol uruchomiono po terminie wszystkich krokow - pacjent nie zostal poproszony o zaden krok, wiec raport nie ocenia zastosowania sie do zalecen.';
    }
    return null;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDateShort(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calcDelay(scheduled: string, completed: string): string {
    const diff = new Date(completed).getTime() - new Date(scheduled).getTime();
    if (diff <= 0) return 'na czas';
    const minutes = Math.round(diff / 60000);
    if (minutes < 60) return `+${minutes} min`;
    const hours = Math.round(minutes / 60);
    return `+${hours}h`;
}

/**
 * Generate a CareFlow compliance report PDF.
 * Returns the PDF as a Uint8Array.
 */
export async function generateCareflowReport(data: CareflowReportData): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    // Helper: add new page if needed
    function ensureSpace(needed: number): void {
        if (y - needed < MARGIN + 30) {
            page = doc.addPage([PAGE_W, PAGE_H]);
            y = PAGE_H - MARGIN;
        }
    }

    // Helper: draw text
    function drawText(
        text: string,
        x: number,
        yPos: number,
        opts: { font?: PDFFont; size?: number; color?: any; maxWidth?: number } = {}
    ): void {
        const font = opts.font || fontRegular;
        const size = opts.size || 10;
        const color = opts.color || COLOR_BLACK;

        page.drawText(toWinAnsi(text), { x, y: yPos, font, size, color, maxWidth: opts.maxWidth });
    }

    /**
     * Lamie tekst do szerokosci kolumny.
     *
     * Helvetica nie zawija sama, a zdania wyjasniajace kroki systemowe sa dluzsze
     * niz strona — bez tego uciekaly poza margines i znikaly z wydruku.
     */
    function wrapText(text: string, size: number, maxWidth: number, font: PDFFont = fontRegular): string[] {
        // Mierzenie szerokosci tez koduje WinAnsi i RZUCA na polskim znaku — musi
        // dostac tekst po transliteracji, tak jak drawText.
        const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                current = candidate;
            } else {
                lines.push(current);
                current = word;
            }
        }
        if (current) lines.push(current);
        return lines;
    }

    // Helper: draw line
    function drawLine(x1: number, yPos: number, x2: number, color = COLOR_GRAY): void {
        page.drawLine({
            start: { x: x1, y: yPos },
            end: { x: x2, y: yPos },
            thickness: 0.5,
            color,
        });
    }

    // ═══════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════
    drawText('MIKROSTOMART', MARGIN, y, { font: fontBold, size: 18, color: COLOR_GOLD });
    drawText('Gabinet Stomatologiczny', MARGIN + 155, y + 2, { size: 9, color: COLOR_GRAY });
    y -= 15;
    drawText('ul. Centralna 33a, 45-940 Opole  |  tel. 570 270 470', MARGIN, y, { size: 8, color: COLOR_GRAY });
    y -= 8;
    drawLine(MARGIN, y, PAGE_W - MARGIN, COLOR_GOLD);
    y -= 20;

    // Report title
    drawText('RAPORT OPIEKI PERI-OPERACYJNEJ', MARGIN, y, { font: fontBold, size: 14 });
    y -= 14;
    drawText('CareFlow Compliance Report', MARGIN, y, { size: 9, color: COLOR_GRAY });
    y -= 8;
    drawText(`Wygenerowano: ${formatDate(new Date().toISOString())}`, MARGIN, y, { size: 8, color: COLOR_GRAY });
    y -= 25;

    // ═══════════════════════════════════════════════════════
    // PATIENT INFO
    // ═══════════════════════════════════════════════════════
    page.drawRectangle({
        x: MARGIN, y: y - 70, width: CONTENT_W, height: 75,
        color: COLOR_LIGHT_BG, borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 0.5,
    });
    y -= 5;

    const col1 = MARGIN + 10;
    const col2 = MARGIN + CONTENT_W / 2;

    drawText('DANE PACJENTA', col1, y, { font: fontBold, size: 10, color: COLOR_GOLD });
    y -= 15;
    drawText(`Pacjent: ${data.enrollment.patient_name}`, col1, y, { font: fontBold, size: 10 });
    drawText(`Telefon: ${data.enrollment.patient_phone || 'brak'}`, col2, y, { size: 9 });
    y -= 13;
    drawText(`Zabieg: ${data.enrollment.template_name}`, col1, y, { size: 9 });
    drawText(`Lekarz: ${data.enrollment.doctor_name || 'brak'}`, col2, y, { size: 9 });
    y -= 13;
    drawText(`Data zabiegu: ${formatDateShort(data.enrollment.appointment_date)}`, col1, y, { size: 9 });
    drawText(`Kwalifikacja: ${data.enrollment.enrolled_by}`, col2, y, { size: 9 });
    y -= 13;
    drawText(`Status: ${data.enrollment.status.toUpperCase()}`, col1, y, { size: 9, color: data.enrollment.status === 'completed' ? COLOR_GREEN : COLOR_RED });
    if (data.enrollment.completed_at) {
        drawText(`Zakonczone: ${formatDate(data.enrollment.completed_at)}`, col2, y, { size: 9 });
    }
    y -= 25;

    // ═══════════════════════════════════════════════════════
    // COMPLIANCE TABLE
    // ═══════════════════════════════════════════════════════
    drawText('TABELA WYKONANIA ZADAN', MARGIN, y, { font: fontBold, size: 11, color: COLOR_GOLD });
    y -= 18;

    // Table header
    const colX = [MARGIN, MARGIN + 30, MARGIN + 230, MARGIN + 340, MARGIN + 420];
    drawText('#', colX[0], y, { font: fontBold, size: 8, color: COLOR_GRAY });
    drawText('Zadanie', colX[1], y, { font: fontBold, size: 8, color: COLOR_GRAY });
    drawText('Zaplanowane', colX[2], y, { font: fontBold, size: 8, color: COLOR_GRAY });
    drawText('Wykonane', colX[3], y, { font: fontBold, size: 8, color: COLOR_GRAY });
    drawText('Opoznienie', colX[4], y, { font: fontBold, size: 8, color: COLOR_GRAY });
    y -= 5;
    drawLine(MARGIN, y, PAGE_W - MARGIN);
    y -= 12;

    // Rozdzial „pominiete przez system" vs „pominiete przez pacjenta" robi jedno
    // miejsce — tabela, podsumowanie i bramka eksportu czytaja ten sam wynik.
    const summary = summarizeCareflowCompliance(data.tasks, data.auditLog);
    const systemSkipped: CareflowReportTask[] = [];

    for (let i = 0; i < data.tasks.length; i++) {
        const task = data.tasks[i];
        const outcome = summary.outcomes[i];
        ensureSpace(14);

        if (outcome === 'skipped_by_system') systemSkipped.push(task);

        // Krok zamkniety przez system dostaje neutralny znacznik i szarosc — czerwone
        // [X] przy kroku, o ktory pacjenta nigdy nie poproszono, to zarzut bez pokrycia.
        const statusIcon =
            outcome === 'done' ? '[V]' : outcome === 'skipped_by_patient' ? '[X]' : outcome === 'skipped_by_system' ? '[-]' : '[ ]';
        const statusColor = outcome === 'done' ? COLOR_GREEN : outcome === 'skipped_by_patient' ? COLOR_RED : COLOR_GRAY;

        // Truncate title to fit
        let title = task.title;
        if (title.length > 32) title = title.substring(0, 30) + '...';

        drawText(`${task.sort_order}`, colX[0], y, { size: 8 });
        drawText(`${statusIcon} ${title}`, colX[1], y, { size: 8, color: statusColor });
        drawText(formatDate(task.scheduled_at), colX[2], y, { size: 7 });

        if (task.completed_at) {
            drawText(formatDate(task.completed_at), colX[3], y, { size: 7 });
            drawText(calcDelay(task.scheduled_at, task.completed_at), colX[4], y, { size: 7, color: COLOR_GRAY });
        } else if (outcome === 'skipped_by_system') {
            drawText('nie dotyczy', colX[3], y, { size: 7, color: COLOR_GRAY });
            drawText('*', colX[4], y, { size: 7, color: COLOR_GRAY });
        } else if (task.skipped_at) {
            drawText('pominiete', colX[3], y, { size: 7, color: COLOR_RED });
        } else {
            drawText('oczekuje', colX[3], y, { size: 7, color: COLOR_GRAY });
        }

        y -= 13;
    }

    y -= 5;
    drawLine(MARGIN, y, PAGE_W - MARGIN);
    y -= 12;

    if (summary.skippedBySystem > 0) {
        ensureSpace(14);
        drawText(
            '* Krok zamkniety przez system - termin minal przed uruchomieniem protokolu, pacjent nie byl o niego proszony.',
            MARGIN,
            y,
            { size: 7, color: COLOR_GRAY }
        );
        y -= 12;
    }
    y -= 6;

    // ═══════════════════════════════════════════════════════
    // COMPLIANCE SUMMARY
    // ═══════════════════════════════════════════════════════
    // Mianownik to `summary.asked` (kroki, o ktore pacjent realnie byl proszony),
    // nie `data.tasks.length`. Stary wzor `wykonane / wszystkie` przy zapisie po
    // zabiegu dawal 11/15 = 73% i werdykt „pacjent pominal czesc zalecen" — o krokach,
    // ktorych pacjent nigdy nie dostal.
    const summaryLines: { text: string; size: number; font?: PDFFont; color?: RGB }[] = [];

    if (summary.compliance === null) {
        // Zerowy mianownik: NIE ma czego oceniac. Zaden werdykt, zaden procent.
        summaryLines.push({
            text: `Krokow, o ktore poproszono pacjenta: 0 z ${summary.total}  |  Zgodnosc: nie dotyczy`,
            size: 11,
            font: fontBold,
            color: COLOR_GRAY,
        });
        summaryLines.push({
            text: 'Raport nie ocenia zastosowania sie do zalecen - pacjentowi nie wyslano ani jednego kroku protokolu.',
            size: 9,
            color: COLOR_GRAY,
        });
    } else {
        const compliance = summary.compliance;
        summaryLines.push({
            text: `Wykonane: ${summary.completed}/${summary.asked}  |  Pominiete przez pacjenta: ${summary.skippedByPatient}  |  Zgodnosc: ${compliance}%`,
            size: 11,
            font: fontBold,
            color: compliance >= 80 ? COLOR_GREEN : compliance >= 50 ? COLOR_GOLD : COLOR_RED,
        });
        summaryLines.push({
            text:
                compliance === 100
                    ? 'Pacjent zastosowal sie do wszystkich zalecen, o ktore zostal poproszony.'
                    : compliance >= 80
                    ? 'Pacjent zastosowal sie do wiekszosci zalecen.'
                    : compliance >= 50
                    ? 'Pacjent pominal czesc zalecen - zalecany kontakt kontrolny.'
                    : 'Pacjent nie zastosowal sie do zalecen - wymagana interwencja.',
            size: 9,
            color: COLOR_GRAY,
        });
    }

    if (summary.pendingDue > 0 || summary.pendingFuture > 0) {
        const parts: string[] = [];
        if (summary.pendingDue > 0) parts.push(`po terminie, bez potwierdzenia: ${summary.pendingDue}`);
        if (summary.pendingFuture > 0) parts.push(`termin jeszcze nie nadszedl: ${summary.pendingFuture} (poza ocena)`);
        summaryLines.push({ text: `Kroki otwarte - ${parts.join('; ')}.`, size: 8, color: COLOR_GRAY });
    }

    if (summary.skippedBySystem > 0) {
        summaryLines.push({
            text: `Poza ocena zgodnosci: ${summary.skippedBySystem} z ${summary.total} krokow zamknal system - ich termin minal przed uruchomieniem protokolu.`,
            size: 8,
            color: COLOR_GRAY,
        });
        summaryLines.push({ text: `Zrodlo rozroznienia: ${SIGNAL_LABEL[summary.signal]}.`, size: 7, color: COLOR_GRAY });
    }

    const exportBlockReason = careflowExportBlockReason(summary);
    if (exportBlockReason) {
        summaryLines.push({
            text: `Raport informacyjny - NIE jest automatycznie dolaczany do dokumentacji medycznej. Powod: ${exportBlockReason}`,
            size: 8,
            color: COLOR_GRAY,
        });
    }

    // Ramka rosnie z trescia — przy zablokowanym eksporcie miesci sie w niej o trzy
    // linie wiecej niz w wersji sprzed rozroznienia krokow systemowych.
    const summaryRows = summaryLines.flatMap((line) =>
        wrapText(line.text, line.size, CONTENT_W - 20, line.font ?? fontRegular).map((text) => ({ ...line, text }))
    );
    const rowStep = (size: number) => size + 4;
    const rowsHeight = summaryRows.reduce((sum, row) => sum + rowStep(row.size), 0);
    const lastStep = summaryRows.length > 0 ? rowStep(summaryRows[summaryRows.length - 1].size) : 0;
    const boxH = 31 + rowsHeight - lastStep;

    ensureSpace(boxH + 25);
    const boxTop = y + 5;

    page.drawRectangle({
        x: MARGIN, y: boxTop - boxH, width: CONTENT_W, height: boxH,
        color: COLOR_LIGHT_BG, borderColor: COLOR_GOLD, borderWidth: 1,
    });
    y -= 3;

    drawText('PODSUMOWANIE ZGODNOSCI', MARGIN + 10, y, { font: fontBold, size: 10, color: COLOR_GOLD });
    y -= 16;
    for (const row of summaryRows) {
        drawText(row.text, MARGIN + 10, y, { font: row.font, size: row.size, color: row.color });
        y -= rowStep(row.size);
    }
    y = boxTop - boxH - 22;

    // ═══════════════════════════════════════════════════════
    // KROKI ZAMKNIETE PRZEZ SYSTEM
    // ═══════════════════════════════════════════════════════
    if (systemSkipped.length > 0) {
        ensureSpace(45);
        drawText('KROKI ZAMKNIETE PRZEZ SYSTEM (poza ocena zgodnosci)', MARGIN, y, { font: fontBold, size: 11, color: COLOR_GOLD });
        y -= 15;

        // Formulujemy to opisowo i bez oceny: dokumentacja medyczna nie moze sugerowac,
        // ze pacjent czegos nie zrobil, skoro nikt go o to nie poprosil.
        for (const line of wrapText(
            'Ponizsze kroki powstaly juz jako zamkniete, poniewaz ich termin minal przed uruchomieniem protokolu. ' +
                'Pacjent nie otrzymal o nich przypomnienia i nie byl proszony o ich wykonanie, dlatego nie wchodza do ' +
                'oceny zgodnosci i nie stanowia informacji o przebiegu zaleconego postepowania.',
            8,
            CONTENT_W
        )) {
            ensureSpace(12);
            drawText(line, MARGIN, y, { size: 8, color: COLOR_GRAY });
            y -= 10;
        }
        y -= 4;

        for (const task of systemSkipped) {
            ensureSpace(12);
            let title = task.title;
            if (title.length > 60) title = title.substring(0, 58) + '...';
            drawText(`- ${task.sort_order}. ${title} (termin: ${formatDate(task.scheduled_at)})`, MARGIN + 10, y, {
                size: 8,
                color: COLOR_GRAY,
            });
            y -= 11;
        }
        y -= 18;
    }

    // ═══════════════════════════════════════════════════════
    // PRESCRIPTION / MEDICATIONS
    // ═══════════════════════════════════════════════════════
    if (data.enrollment.prescription_code || data.enrollment.custom_medications) {
        ensureSpace(50);
        drawText('LEKI I RECEPTA', MARGIN, y, { font: fontBold, size: 11, color: COLOR_GOLD });
        y -= 15;

        if (data.enrollment.prescription_code) {
            drawText(`Kod recepty: ${data.enrollment.prescription_code}`, MARGIN, y, { size: 9 });
            y -= 13;
        }

        const meds = data.enrollment.custom_medications || [];
        if (Array.isArray(meds)) {
            for (const med of meds) {
                ensureSpace(14);
                drawText(`- ${med.name || '?'} (${med.dose || '?'})  ${med.description || ''}`, MARGIN + 10, y, { size: 8, maxWidth: CONTENT_W - 20 });
                y -= 12;
            }
        }
        y -= 10;
    }

    // ═══════════════════════════════════════════════════════
    // AUDIT LOG
    // ═══════════════════════════════════════════════════════
    if (data.auditLog.length > 0) {
        ensureSpace(30);
        drawText('DZIENNIK ZDARZEN (AUDIT LOG)', MARGIN, y, { font: fontBold, size: 11, color: COLOR_GOLD });
        y -= 15;

        for (const log of data.auditLog) {
            ensureSpace(14);
            const time = formatDate(log.created_at);
            const actionLabel = translateAction(log.action);
            drawText(`${time}  |  ${actionLabel}  |  ${log.actor}`, MARGIN, y, { size: 7, color: COLOR_GRAY });
            y -= 11;
        }
        y -= 10;
    }

    // ═══════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════
    if (data.enrollment.custom_notes) {
        ensureSpace(40);
        drawText('NOTATKI', MARGIN, y, { font: fontBold, size: 11, color: COLOR_GOLD });
        y -= 15;
        drawText(data.enrollment.custom_notes, MARGIN, y, { size: 9, maxWidth: CONTENT_W });
        y -= 30;
    }

    // ═══════════════════════════════════════════════════════
    // FOOTER — signature line
    // ═══════════════════════════════════════════════════════
    ensureSpace(60);
    y -= 20;
    drawLine(MARGIN, y, MARGIN + 200);
    drawText('Podpis lekarza', MARGIN, y - 12, { size: 8, color: COLOR_GRAY });

    drawLine(PAGE_W - MARGIN - 200, y, PAGE_W - MARGIN);
    drawText('Data', PAGE_W - MARGIN - 200, y - 12, { size: 8, color: COLOR_GRAY });

    // Page number
    const pages = doc.getPages();
    for (let i = 0; i < pages.length; i++) {
        pages[i].drawText(`Strona ${i + 1}/${pages.length}`, {
            x: PAGE_W - MARGIN - 60, y: 20,
            font: fontRegular, size: 7, color: COLOR_GRAY,
        });
        pages[i].drawText(`CareFlow Report | ID: ${data.enrollment.id.slice(0, 8)}`, {
            x: MARGIN, y: 20,
            font: fontRegular, size: 7, color: COLOR_GRAY,
        });
    }

    return doc.save();
}

/**
 * Sprowadza tekst do zakresu WinAnsi.
 *
 * Standardowa Helvetica z pdf-lib koduje WinAnsi (CP1252) i przy pierwszym polskim
 * znaku RZUCA WYJATKIEM ('WinAnsi cannot encode "ę"'), wywracajac cale generowanie
 * raportu. Stale w tym pliku sa pisane bez diakrytykow, ale tresci ida Z BAZY —
 * seedowe tytuly zadan to m.in. "Wykup receptę" i "Weź antybiotyk", wiec KAZDY raport
 * konczyl sie bledem: w cronie jako errors++ i pusty report_pdf_url (probowany co noc
 * w kolko), w panelu jako 500. Rozklad NFD odrywa znaki diakrytyczne od liter bazowych;
 * 'ł/Ł' nie ma rozkladu, wiec mapujemy je osobno.
 *
 * Docelowo: fontkit + font z pelnym Unicode (wtedy ten helper znika).
 */
function toWinAnsi(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ł/g, 'l')
        .replace(/Ł/g, 'L');
}

/**
 * Etykiety dziennika zdarzen do kartoteki pacjenta.
 *
 * Bez polskich znakow diakrytycznych — raport sklada sie standardowym Helvetica
 * (WinAnsi), ktore nie zakoduje 'ą/ę/ł/ż/ś/ć/ń' i wywroci generowanie PDF.
 */
function translateAction(action: string): string {
    const map: Record<string, string> = {
        'auto_enrolled': 'Auto-kwalifikacja',
        'enrolled': 'Kwalifikacja',
        // Auto-kwalifikacja tworzy PROPOZYCJE — zadania powstaja dopiero po akceptacji lekarza.
        'proposed': 'Propozycja utworzona',
        'proposal_accepted': 'Propozycja zaakceptowana',
        'proposal_rejected': 'Propozycja odrzucona',
        'cancelled_by_appointment_cancel': 'Anulowany (odwolana wizyta)',
        'rescheduled_by_appointment': 'Przelozony (zmiana terminu wizyty)',
        'anonymized_by_account_delete': 'Zanonimizowany (usuniete konto)',
        'task_completed': 'Zadanie wykonane',
        'task_skipped': 'Zadanie pominiete',
        // Krok URODZIL sie zamkniety — nigdy nie trafil do pacjenta. Etykieta nie
        // moze brzmiec jak pominiecie przez pacjenta, bo to zapis o systemie.
        'task_skipped_past_due': 'Krok zamkniety przez system (termin minal przed uruchomieniem protokolu)',
        // Krok byl zywy, przypomnienia poszly, pacjent go nie potwierdzil w oknie wysylki.
        'task_expired': 'Zadanie zamkniete automatycznie (uplynal termin, brak potwierdzenia)',
        'report_export_blocked': 'Eksport do kartoteki wstrzymany (brak tresci klinicznej)',
        'push_sent': 'Push wyslany',
        'sms_fallback_sent': 'SMS wyslany (fallback)',
        'auto_completed': 'Auto-zakonczony',
        'prescription_added': 'Recepta dodana',
        'medication_changed': 'Zmiana lekow',
        'follow_up_added': 'Dodano wizyte kontrolna',
        'cancelled': 'Anulowany',
        'report_generated': 'Raport wygenerowany',
        'exported_to_prodentis': 'Eksport do Prodentis',
    };
    return map[action] || action;
}

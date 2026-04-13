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

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

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
    tasks: {
        title: string;
        sort_order: number;
        scheduled_at: string;
        completed_at?: string;
        skipped_at?: string;
        medication_name?: string;
        medication_dose?: string;
    }[];
    auditLog: {
        action: string;
        actor: string;
        created_at: string;
        details?: any;
    }[];
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

        page.drawText(text, { x, y: yPos, font, size, color, maxWidth: opts.maxWidth });
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

    let completedCount = 0;
    let skippedCount = 0;

    for (const task of data.tasks) {
        ensureSpace(14);

        const status = task.completed_at ? 'done' : task.skipped_at ? 'skipped' : 'pending';
        if (status === 'done') completedCount++;
        if (status === 'skipped') skippedCount++;

        const statusIcon = status === 'done' ? '[V]' : status === 'skipped' ? '[X]' : '[ ]';
        const statusColor = status === 'done' ? COLOR_GREEN : status === 'skipped' ? COLOR_RED : COLOR_GRAY;

        // Truncate title to fit
        let title = task.title;
        if (title.length > 32) title = title.substring(0, 30) + '...';

        drawText(`${task.sort_order}`, colX[0], y, { size: 8 });
        drawText(`${statusIcon} ${title}`, colX[1], y, { size: 8, color: statusColor });
        drawText(formatDate(task.scheduled_at), colX[2], y, { size: 7 });

        if (task.completed_at) {
            drawText(formatDate(task.completed_at), colX[3], y, { size: 7 });
            drawText(calcDelay(task.scheduled_at, task.completed_at), colX[4], y, { size: 7, color: COLOR_GRAY });
        } else if (task.skipped_at) {
            drawText('pominiete', colX[3], y, { size: 7, color: COLOR_RED });
        } else {
            drawText('oczekuje', colX[3], y, { size: 7, color: COLOR_GRAY });
        }

        y -= 13;
    }

    y -= 5;
    drawLine(MARGIN, y, PAGE_W - MARGIN);
    y -= 18;

    // ═══════════════════════════════════════════════════════
    // COMPLIANCE SUMMARY
    // ═══════════════════════════════════════════════════════
    ensureSpace(60);
    const total = data.tasks.length;
    const compliance = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    page.drawRectangle({
        x: MARGIN, y: y - 40, width: CONTENT_W, height: 45,
        color: COLOR_LIGHT_BG, borderColor: COLOR_GOLD, borderWidth: 1,
    });
    y -= 3;

    drawText('PODSUMOWANIE ZGODNOSCI', MARGIN + 10, y, { font: fontBold, size: 10, color: COLOR_GOLD });
    y -= 16;
    drawText(`Wykonane: ${completedCount}/${total}  |  Pominiete: ${skippedCount}  |  Zgodnosc: ${compliance}%`, MARGIN + 10, y, { font: fontBold, size: 11, color: compliance >= 80 ? COLOR_GREEN : compliance >= 50 ? COLOR_GOLD : COLOR_RED });
    y -= 14;

    const complianceText = compliance === 100
        ? 'Pacjent zastosowal sie do wszystkich zalecen.'
        : compliance >= 80
        ? 'Pacjent zastosowal sie do wiekszosci zalecen.'
        : compliance >= 50
        ? 'Pacjent pominal czesc zalecen — zalecany kontakt kontrolny.'
        : 'Pacjent nie zastosowal sie do zalecen — wymagana interwencja.';

    drawText(complianceText, MARGIN + 10, y, { size: 9, color: COLOR_GRAY });
    y -= 30;

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

function translateAction(action: string): string {
    const map: Record<string, string> = {
        'auto_enrolled': 'Auto-kwalifikacja',
        'enrolled': 'Kwalifikacja',
        'task_completed': 'Zadanie wykonane',
        'task_skipped': 'Zadanie pominiete',
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

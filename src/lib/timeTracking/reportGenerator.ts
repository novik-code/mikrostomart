// Generator raportów czasu pracy: PDF (pdf-lib) + CSV
// Raport miesięczny per pracownik — do listy płac.

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_GOLD = rgb(0.86, 0.69, 0.23);
const COLOR_GREEN = rgb(0.13, 0.77, 0.37);
const COLOR_RED = rgb(0.87, 0.25, 0.25);
const COLOR_AMBER = rgb(0.98, 0.74, 0.14);
const COLOR_GRAY = rgb(0.5, 0.5, 0.5);
const COLOR_LIGHT_BG = rgb(0.96, 0.96, 0.96);
const COLOR_BLUE = rgb(0.23, 0.51, 0.96);

// pdf-lib + Helvetica nie obsługują polskich znaków → sanityzacja na ASCII
function clean(s: string): string {
    return (s || '')
        .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c').replace(/[ęĘ]/g, 'e')
        .replace(/[łŁ]/g, 'l').replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
        .replace(/[śŚ]/g, 's').replace(/[źŹżŻ]/g, 'z');
}

function fmtMin(min: number): string {
    if (!min) return '0:00';
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${min < 0 ? '-' : ''}${h}:${String(m).padStart(2, '0')}`;
}

function fmtTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
}

function fmtDate(iso: string): string {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMonthLabel(month: string): string {
    const [y, m] = month.split('-').map((s) => Number.parseInt(s, 10));
    const months = ['styczen','luty','marzec','kwiecien','maj','czerwiec','lipiec','sierpien','wrzesien','pazdziernik','listopad','grudzien'];
    return `${months[m - 1]} ${y}`;
}

const ABSENCE_LABELS: Record<string, string> = {
    vacation:   'Urlop wypoczynkowy',
    on_demand:  'Urlop na zadanie',
    sick:       'Chorobowe',
    child_care: 'Opieka',
    training:   'Szkolenie',
    delegation: 'Delegacja',
    unpaid:     'Bezplatny',
    other:      'Inne',
};

export interface ReportShift {
    date: string;
    actual_start: string | null;
    actual_end: string | null;
    worked_minutes: number;
    planned_minutes: number;
    planned_start_time: string | null;
    planned_end_time: string | null;
    absence_type: string | null;
    late_minutes: number;
    early_leave_minutes: number;
    overtime_total_minutes: number;
    overtime_justified_minutes: number;
    overtime_unjustified_minutes: number;
    auto_closed: boolean;
    status: string;
    anomaly_flags: string[];
}

export interface ReportData {
    employee: { id: string; name: string; position: string | null; contractType: string };
    month: string;                       // YYYY-MM
    workingDays: number;
    dailyHours: number;
    normaMinutes: number;
    hourlyRate: number | null;           // PLN/h, opcjonalnie z employment_terms
    shifts: ReportShift[];
    totals: {
        days: number;
        worked_minutes: number;
        planned_minutes: number;
        late_minutes: number;
        early_leave_minutes: number;
        overtime_total_minutes: number;
        overtime_justified_minutes: number;
        overtime_unjustified_minutes: number;
        absence_days: number;
        days_with_anomalies: number;
    };
}

// ── PDF generator ───────────────────────────────────────────────────

export async function generatePdfReport(data: ReportData): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const fontReg = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function newPage() {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
    }

    function ensure(needed: number) {
        if (y - needed < MARGIN + 20) newPage();
    }

    function txt(s: string, x: number, ypos: number, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}) {
        const font = opts.font ?? fontReg;
        const size = opts.size ?? 9;
        const color = opts.color ?? COLOR_BLACK;
        page.drawText(clean(s), { x, y: ypos, font, size, color });
    }

    function rect(x: number, ypos: number, w: number, h: number, color: ReturnType<typeof rgb>) {
        page.drawRectangle({ x, y: ypos, width: w, height: h, color });
    }

    function line(x1: number, y1: number, x2: number, y2: number, color = COLOR_GRAY) {
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color });
    }

    // Header firmy
    txt('MIKROSTOMART', MARGIN, y, { font: fontBold, size: 16, color: COLOR_GOLD });
    txt('Gabinet Stomatologiczny', MARGIN + 145, y + 2, { size: 8, color: COLOR_GRAY });
    y -= 12;
    txt('ul. Centralna 33a, 45-046 Opole  |  tel. 570 270 470', MARGIN, y, { size: 7, color: COLOR_GRAY });
    y -= 6;
    line(MARGIN, y, PAGE_W - MARGIN, y, COLOR_GOLD);
    y -= 18;

    // Tytuł raportu
    txt(`RAPORT CZASU PRACY — ${fmtMonthLabel(data.month)}`, MARGIN, y, { font: fontBold, size: 13 });
    y -= 12;
    txt(`Wygenerowano: ${new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}`, MARGIN, y, { size: 7, color: COLOR_GRAY });
    y -= 18;

    // Sekcja PRACOWNIK
    txt('PRACOWNIK', MARGIN, y, { font: fontBold, size: 9, color: COLOR_GOLD });
    y -= 12;
    txt(`Imie i nazwisko: ${data.employee.name}`, MARGIN, y, { font: fontBold, size: 10 });
    txt(`Stanowisko: ${data.employee.position ?? '—'}`, MARGIN + 280, y, { size: 9 });
    y -= 11;
    txt(`Umowa: ${data.employee.contractType.toUpperCase()}`, MARGIN, y, { size: 9 });
    txt(`Norma dzienna: ${data.dailyHours}h`, MARGIN + 150, y, { size: 9 });
    txt(`Norma miesieczna: ${fmtMin(data.normaMinutes)}h (${data.workingDays} dni roboczych)`, MARGIN + 280, y, { size: 9 });
    y -= 16;
    line(MARGIN, y, PAGE_W - MARGIN, y, COLOR_GRAY);
    y -= 14;

    // Sekcja PODSUMOWANIE
    txt('PODSUMOWANIE MIESIACA', MARGIN, y, { font: fontBold, size: 9, color: COLOR_GOLD });
    y -= 14;

    // Tabela 2-kolumnowa: label / value
    const ratio = data.normaMinutes ? data.totals.worked_minutes / data.normaMinutes : 0;
    const workedColor = ratio >= 1 ? COLOR_GREEN : ratio >= 0.95 ? COLOR_AMBER : COLOR_RED;

    const sumRows: Array<[string, string, ReturnType<typeof rgb>?]> = [
        ['Dni robocze:',                             `${data.totals.days} z ${data.workingDays}`],
        ['Dni nieobecne:',                            `${data.totals.absence_days}`],
        ['Dni z anomaliami:',                         `${data.totals.days_with_anomalies}`],
        ['Czas planowany:',                           fmtMin(data.totals.planned_minutes)],
        ['Czas faktyczny:',                           fmtMin(data.totals.worked_minutes)],
        ['Roznica vs norma:',                         fmtMin(data.totals.worked_minutes - data.normaMinutes), workedColor],
        ['Spoznienia (suma):',                        fmtMin(data.totals.late_minutes), data.totals.late_minutes > 0 ? COLOR_AMBER : undefined],
        ['Wczesniejsze wyjscia:',                     fmtMin(data.totals.early_leave_minutes)],
        ['Nadgodziny ZASADNE:',                       fmtMin(data.totals.overtime_justified_minutes), COLOR_GREEN],
        ['Nadgodziny NIEZASADNE:',                    fmtMin(data.totals.overtime_unjustified_minutes), data.totals.overtime_unjustified_minutes > 0 ? COLOR_RED : undefined],
    ];

    for (const [label, value, color] of sumRows) {
        ensure(12);
        txt(label, MARGIN + 5, y, { size: 9, color: COLOR_GRAY });
        txt(value, MARGIN + 220, y, { font: fontBold, size: 10, color: color ?? COLOR_BLACK });
        y -= 11;
    }

    if (data.hourlyRate) {
        const justifiedHours = (data.totals.overtime_justified_minutes / 60);
        const baseHours = (data.totals.worked_minutes / 60) - justifiedHours;  // standardowe godziny
        const unjustifiedHours = (data.totals.overtime_unjustified_minutes / 60);
        const grossPay = (baseHours + justifiedHours * 1.5) * data.hourlyRate;
        y -= 6;
        line(MARGIN, y, MARGIN + 350, y, COLOR_GOLD);
        y -= 12;
        txt('SZACUNKOWE WYNAGRODZENIE (do weryfikacji ksiegowej)', MARGIN + 5, y, { font: fontBold, size: 9, color: COLOR_GOLD });
        y -= 12;
        txt(`Stawka godzinowa: ${data.hourlyRate.toFixed(2)} PLN/h`, MARGIN + 5, y, { size: 9 });
        y -= 11;
        txt(`Standard (${(baseHours).toFixed(2)}h): ${(baseHours * data.hourlyRate).toFixed(2)} PLN`, MARGIN + 5, y, { size: 9 });
        y -= 11;
        txt(`Nadgodziny zasadne x1.5 (${justifiedHours.toFixed(2)}h): ${(justifiedHours * data.hourlyRate * 1.5).toFixed(2)} PLN`, MARGIN + 5, y, { size: 9, color: COLOR_GREEN });
        y -= 11;
        if (unjustifiedHours > 0) {
            txt(`Nadgodziny niezasadne (${unjustifiedHours.toFixed(2)}h): NIE PLATNE`, MARGIN + 5, y, { size: 9, color: COLOR_RED });
            y -= 11;
        }
        txt(`RAZEM: ${grossPay.toFixed(2)} PLN brutto`, MARGIN + 5, y, { font: fontBold, size: 11, color: COLOR_GOLD });
        y -= 14;
    }

    y -= 6;
    line(MARGIN, y, PAGE_W - MARGIN, y, COLOR_GRAY);
    y -= 14;

    // Sekcja TABELA DNI
    ensure(40);
    txt('SZCZEGOLY DNI', MARGIN, y, { font: fontBold, size: 9, color: COLOR_GOLD });
    y -= 12;

    // Header tabeli
    const colX = [MARGIN, MARGIN + 50, MARGIN + 110, MARGIN + 175, MARGIN + 230, MARGIN + 280, MARGIN + 340, MARGIN + 410];
    const headers = ['Data', 'Plan', 'Faktycznie', 'Pracy', 'Spozn.', 'Wcz.', 'Ndg ✓ / ✗', 'Status'];
    rect(MARGIN - 3, y - 2, CONTENT_W + 6, 14, COLOR_LIGHT_BG);
    headers.forEach((h, i) => txt(h, colX[i], y + 2, { font: fontBold, size: 8 }));
    y -= 14;

    for (const s of data.shifts) {
        ensure(12);
        const dt = new Date(s.date + 'T00:00:00Z');
        const dayLabel = `${String(dt.getUTCDate()).padStart(2, '0')}.${String(dt.getUTCMonth() + 1).padStart(2, '0')} ${['nd','pn','wt','sr','cz','pt','sb'][dt.getUTCDay()]}`;
        const isWeekend = dt.getUTCDay() === 0 || dt.getUTCDay() === 6;

        if (s.absence_type) {
            txt(dayLabel, colX[0], y, { size: 8, color: isWeekend ? COLOR_GRAY : COLOR_BLACK });
            txt(ABSENCE_LABELS[s.absence_type] ?? s.absence_type, colX[1], y, { size: 8, color: COLOR_BLUE });
            y -= 11;
            continue;
        }

        txt(dayLabel, colX[0], y, { size: 8, color: isWeekend ? COLOR_GRAY : COLOR_BLACK });
        txt(s.planned_start_time && s.planned_end_time ? `${s.planned_start_time.slice(0, 5)}-${s.planned_end_time.slice(0, 5)}` : '—', colX[1], y, { size: 8 });
        txt(`${fmtTime(s.actual_start)}-${fmtTime(s.actual_end)}${s.auto_closed ? '*' : ''}`, colX[2], y, { size: 8 });
        txt(fmtMin(s.worked_minutes), colX[3], y, { size: 8, font: fontBold });
        txt(s.late_minutes > 0 ? fmtMin(s.late_minutes) : '—', colX[4], y, { size: 8, color: s.late_minutes > 0 ? COLOR_AMBER : COLOR_GRAY });
        txt(s.early_leave_minutes > 0 ? fmtMin(s.early_leave_minutes) : '—', colX[5], y, { size: 8 });

        // Nadgodziny zasadne / niezasadne
        let ndgStr = '—';
        let ndgColor = COLOR_GRAY;
        if (s.overtime_justified_minutes > 0 || s.overtime_unjustified_minutes > 0) {
            const j = s.overtime_justified_minutes;
            const u = s.overtime_unjustified_minutes;
            ndgStr = `${j > 0 ? `+${fmtMin(j)}` : ''}${j > 0 && u > 0 ? ' / ' : ''}${u > 0 ? `+${fmtMin(u)}` : ''}`;
            ndgColor = u > 0 ? COLOR_RED : COLOR_GREEN;
        } else if (s.overtime_total_minutes > 0) {
            ndgStr = `+${fmtMin(s.overtime_total_minutes)}`;
            ndgColor = COLOR_BLUE;
        }
        txt(ndgStr, colX[6], y, { size: 8, color: ndgColor });

        // Status
        const statusLabel = s.status === 'admin_approved' ? 'zatw.' : s.anomaly_flags.length > 0 ? `${s.anomaly_flags.length} anom.` : 'OK';
        const statusColor = s.status === 'admin_approved' ? COLOR_GREEN : s.anomaly_flags.length > 0 ? COLOR_AMBER : COLOR_GRAY;
        txt(statusLabel, colX[7], y, { size: 8, color: statusColor });

        y -= 11;
    }

    y -= 8;
    line(MARGIN, y, PAGE_W - MARGIN, y, COLOR_GRAY);
    y -= 12;

    // Legenda i podpis
    ensure(50);
    txt('* — sesja auto-domknieta przez system (brak clock_out)', MARGIN, y, { size: 7, color: COLOR_GRAY });
    y -= 9;
    txt('Ndg ✓ — nadgodziny zasadne (po lekarzu + bufor 30 min). Ndg ✗ — nadgodziny niezasadne, niepatne.', MARGIN, y, { size: 7, color: COLOR_GRAY });
    y -= 9;
    txt(`Status "zatw." — wpis recznie zatwierdzony przez admina (z notatka w audit log).`, MARGIN, y, { size: 7, color: COLOR_GRAY });
    y -= 26;

    // Podpisy
    txt('Pracownik:', MARGIN, y, { size: 9 });
    line(MARGIN + 60, y - 2, MARGIN + 250, y - 2, COLOR_BLACK);
    txt('Akceptujacy:', MARGIN + 280, y, { size: 9 });
    line(MARGIN + 350, y - 2, PAGE_W - MARGIN, y - 2, COLOR_BLACK);
    y -= 14;
    txt('Data:', MARGIN, y, { size: 7, color: COLOR_GRAY });
    line(MARGIN + 24, y - 2, MARGIN + 130, y - 2, COLOR_GRAY);
    txt('Data:', MARGIN + 280, y, { size: 7, color: COLOR_GRAY });
    line(MARGIN + 304, y - 2, MARGIN + 410, y - 2, COLOR_GRAY);

    // Footer
    const footerY = MARGIN - 10;
    txt(`Mikrostomart KCP — Raport ${data.month} — ${data.employee.name}`, MARGIN, footerY, { size: 6, color: COLOR_GRAY });
    txt(`Strona ${doc.getPageCount()}`, PAGE_W - MARGIN - 40, footerY, { size: 6, color: COLOR_GRAY });

    return await doc.save();
}

// ── CSV generator ───────────────────────────────────────────────────

function csvEscape(v: string | number | null | undefined): string {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export function generateCsvReport(data: ReportData): string {
    const lines: string[] = [];

    // Header / meta
    lines.push(`# Raport czasu pracy — ${fmtMonthLabel(data.month)}`);
    lines.push(`# Pracownik: ${data.employee.name} (${data.employee.position ?? '—'})`);
    lines.push(`# Umowa: ${data.employee.contractType.toUpperCase()}, norma ${data.dailyHours}h/dzien, ${data.workingDays} dni roboczych`);
    lines.push(`# Wygenerowano: ${new Date().toISOString()}`);
    lines.push('');

    // Tabela szczegółowa
    lines.push([
        'data', 'dzien_tyg', 'plan_start', 'plan_end', 'faktyczny_start', 'faktyczny_end',
        'pracowane_min', 'planowane_min', 'spoznienie_min', 'wczesne_wyjscie_min',
        'nadgodziny_zasadne_min', 'nadgodziny_niezasadne_min', 'nadgodziny_total_min',
        'nieobecnosc', 'auto_domkniete', 'status', 'anomalie',
    ].join(';'));

    for (const s of data.shifts) {
        const dt = new Date(s.date + 'T00:00:00Z');
        const dow = ['niedz','pn','wt','sr','cz','pt','sb'][dt.getUTCDay()];
        lines.push([
            s.date,
            dow,
            s.planned_start_time?.slice(0, 5) ?? '',
            s.planned_end_time?.slice(0, 5) ?? '',
            s.actual_start ? new Date(s.actual_start).toISOString() : '',
            s.actual_end ? new Date(s.actual_end).toISOString() : '',
            s.worked_minutes,
            s.planned_minutes,
            s.late_minutes,
            s.early_leave_minutes,
            s.overtime_justified_minutes,
            s.overtime_unjustified_minutes,
            s.overtime_total_minutes,
            s.absence_type ? (ABSENCE_LABELS[s.absence_type] ?? s.absence_type) : '',
            s.auto_closed ? 'TAK' : '',
            s.status,
            s.anomaly_flags.join('|'),
        ].map(csvEscape).join(';'));
    }

    // Podsumowanie
    lines.push('');
    lines.push('# PODSUMOWANIE');
    lines.push(`pracowane_total_min;${data.totals.worked_minutes}`);
    lines.push(`norma_min;${data.normaMinutes}`);
    lines.push(`roznica_min;${data.totals.worked_minutes - data.normaMinutes}`);
    lines.push(`spoznienia_total_min;${data.totals.late_minutes}`);
    lines.push(`nadgodziny_zasadne_total_min;${data.totals.overtime_justified_minutes}`);
    lines.push(`nadgodziny_niezasadne_total_min;${data.totals.overtime_unjustified_minutes}`);
    lines.push(`dni_pracy;${data.totals.days}`);
    lines.push(`dni_nieobecnosc;${data.totals.absence_days}`);
    lines.push(`dni_z_anomaliami;${data.totals.days_with_anomalies}`);
    if (data.hourlyRate) {
        const justifiedH = data.totals.overtime_justified_minutes / 60;
        const baseH = (data.totals.worked_minutes / 60) - justifiedH;
        const grossPay = (baseH + justifiedH * 1.5) * data.hourlyRate;
        lines.push(`stawka_godzinowa_pln;${data.hourlyRate.toFixed(2)}`);
        lines.push(`wynagrodzenie_szac_pln;${grossPay.toFixed(2)}`);
    }

    return lines.join('\n');
}

// ─── Schedule Types & Constants for Employee Zone ───────────────────
// Extracted from pracownik/page.tsx for modularity

export interface Badge {
    id: string;
    name: string;
    color: string | null;
}

export interface ScheduleAppointment {
    id: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    doctorId: string;
    startTime: string;
    endTime: string;
    duration: number;
    appointmentType: string;
    appointmentTypeId: string;
    isWorkingHour: boolean;
    patientPhone: string;
    notes: string | null;
    badges: Badge[];
}

export interface Visit {
    date: string;
    endDate: string;
    doctor: {
        id: string;
        name: string;
        title?: string;
    };
    cost: number;
    paid: number;
    balance: number;
    paymentStatus: string;
    medicalDetails?: {
        diagnosis?: string;
        visitDescription?: string;
        recommendations?: string;
        procedures?: Array<{
            tooth?: string;
            procedureName: string;
            diagnosis?: string;
            price: number;
        }>;
        medications?: Array<{
            name: string;
            dosage?: string;
            duration?: string;
        }>;
    };
}

export interface ScheduleDay {
    date: string;
    dayName: string;
    appointments: ScheduleAppointment[];
}

export interface ScheduleData {
    weekStart: string;
    days: ScheduleDay[];
    doctors: string[];
}

// ─── Prodentis appointment type color map (by ID, matching desktop app) ────
export const PRODENTIS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
    '0000000001': { bg: '#FFD700', border: '#DAA520', text: '#000', label: 'Zachowawcza' },
    '0000000003': { bg: '#FF00FF', border: '#CC00CC', text: '#fff', label: 'Chirurgia' },
    '0000000006': { bg: '#FFA500', border: '#E08900', text: '#000', label: 'Pierwsza wizyta' },
    '0000000010': { bg: '#00CC00', border: '#009900', text: '#000', label: 'Protetyka' },
    '0000000012': { bg: '#FFFF00', border: '#CCCC00', text: '#000', label: 'Konsultacja' },
    '0000000014': { bg: '#00CCCC', border: '#009999', text: '#000', label: 'Higienizacja' },
    '0000000016': { bg: '#00FF00', border: '#00CC00', text: '#000', label: 'KONTROLA' },
    '0000000027': { bg: '#6699FF', border: '#3366CC', text: '#fff', label: 'Gabinet nr 1' },
    '0000000029': { bg: '#FF0000', border: '#CC0000', text: '#fff', label: 'LASER' },
    '0000000030': { bg: '#FF66CC', border: '#CC3399', text: '#000', label: 'Odbudowa do ENDO' },
    '0000000033': { bg: '#FF3333', border: '#CC0000', text: '#fff', label: 'ORTODONCJA' },
    '0000000034': { bg: '#CC99FF', border: '#9966CC', text: '#000', label: 'Endodoncja' },
    '0000000035': { bg: '#FFFFFF', border: '#CCCCCC', text: '#000', label: 'Wolny termin' },
    '0000000036': { bg: '#999999', border: '#666666', text: '#fff', label: 'Obiąd' },
    '0000000037': { bg: '#66CCFF', border: '#3399CC', text: '#000', label: 'Siłownia' },
    '0000000038': { bg: '#FF9966', border: '#CC6633', text: '#000', label: 'Badanie + leczenie' },
};

export const DEFAULT_COLOR = { bg: '#14b8a6', border: '#0d9488', text: '#fff', label: 'Inne' };

// ─── Badge letter map (from Prodentis API /api/badge-types) ──────
export const BADGE_LETTERS: Record<string, string> = {
    '0000000001': 'V',     // VIP
    '0000000002': '!',     // WAŻNE
    '0000000003': '?',     // Pacjent NIE potwierdzony
    '0000000004': 'B',     // Pacjent z bólem
    '0000000005': 'A',     // AWARIA
    '0000000006': 'MGR',   // Dane do magisterki MN
    '0000000007': 'PL',    // Plan leczenia do oddania
    '0000000008': 'TK',    // CBCT kontr.do wykonania
    '0000000009': 'P',     // Pierwszorazowy
    '0000000010': ';)',    // Pacjent potwierdzony
    '0000000011': 'KASA',  // spr.czy przyszedł przelew
};

export function getBadgeLetter(badgeId: string): string {
    return BADGE_LETTERS[badgeId] || '•';
}

export function getAppointmentColor(typeId: string): { bg: string; border: string; text: string } {
    return PRODENTIS_COLORS[typeId] || DEFAULT_COLOR;
}

// ─── Time helpers ────────────────────────────────────────────────
export const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
        if (h === 20 && m > 0) break;
        TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
}

export function timeToSlotIndex(time: string): number {
    return TIME_SLOTS.indexOf(time);
}

export function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

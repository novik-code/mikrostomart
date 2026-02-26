/**
 * Shared doctor/specialist mapping — single source of truth
 * Used by: AppointmentScheduler, reservation API, admin panel, cron jobs
 */

export interface DoctorInfo {
    prodentisId: string | null;
    name: string;
    role: 'doctor' | 'hygienist';
    defaultDuration: number; // minutes
}

export const DOCTOR_MAPPING: Record<string, DoctorInfo> = {
    marcin: {
        prodentisId: '0100000001',
        name: 'lek. dent. Marcin Nowosielski',
        role: 'doctor',
        defaultDuration: 30,
    },
    ilona: {
        prodentisId: '0100000024',
        name: 'lek. dent. Ilona Piechaczek',
        role: 'doctor',
        defaultDuration: 30,
    },
    katarzyna: {
        prodentisId: '0100000003',
        name: 'lek. dent. Katarzyna Hałupczok',
        role: 'doctor',
        defaultDuration: 30,
    },
    dominika: {
        prodentisId: '0100000036',
        name: 'lek. dent. Dominika Milicz',
        role: 'doctor',
        defaultDuration: 30,
    },
    malgorzata: {
        prodentisId: '0100000031',
        name: 'hig. stom. Małgorzata Zyskowska',
        role: 'hygienist',
        defaultDuration: 60,
    },
};

/**
 * Get doctor info by specialist ID
 */
export function getDoctorInfo(specialistId: string): DoctorInfo | null {
    return DOCTOR_MAPPING[specialistId] || null;
}

/**
 * Get specialist ID by Prodentis doctor ID
 */
export function getSpecialistByProdentisId(prodentisId: string): string | null {
    for (const [key, info] of Object.entries(DOCTOR_MAPPING)) {
        if (info.prodentisId === prodentisId) return key;
    }
    return null;
}

/**
 * Normalize phone number for comparison
 * Strips +, spaces, dashes → pure digits, ensures 48 prefix for Polish numbers
 */
export function normalizePhone(phone: string): string {
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length === 9) return `48${digits}`;
    if (digits.startsWith('48') && digits.length === 11) return digits;
    if (digits.startsWith('0048') && digits.length === 13) return digits.slice(2);
    return digits;
}

/**
 * Fuzzy last name match — case insensitive, removes Polish diacritics
 */
export function fuzzyNameMatch(name1: string, name2: string): boolean {
    const normalize = (s: string) =>
        s.toLowerCase()
            .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
            .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
            .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
            .trim();
    return normalize(name1) === normalize(name2);
}

/**
 * Extract last name from full name (heuristic: last word)
 */
export function extractLastName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || fullName;
}

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
    elzbieta: {
        prodentisId: '0100000002',
        name: 'hig. stom. Elżbieta Nowosielska',
        role: 'hygienist',
        defaultDuration: 30,
    },
    ilona: {
        prodentisId: '0100000024',
        name: 'lek. dent. Ilona Piechaczek',
        role: 'doctor',
        defaultDuration: 30,
    },
    aleksandra: {
        prodentisId: '0100000028',
        name: 'lek. dent. Aleksandra Modelska-Kępa',
        role: 'doctor',
        defaultDuration: 30,
    },
    malgorzata: {
        prodentisId: '0100000030',
        name: 'hig. stom. Małgorzata Maćków-Huras',
        role: 'hygienist',
        defaultDuration: 60,
    },
    katarzyna: {
        prodentisId: '0100000031',
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
    wiktoria: {
        prodentisId: '0100000037',
        name: 'lek. dent. Wiktoria Leja',
        role: 'doctor',
        defaultDuration: 30,
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
 * Normalize a name: strip Polish diacritics, lowercase, trim
 */
export function normalizeName(s: string): string {
    return s.toLowerCase()
        .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
        .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
        .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
        .replace(/[''`]/g, '')
        .trim();
}

/**
 * Fuzzy name match — case insensitive, removes Polish diacritics
 * Kept for backward compatibility
 */
export function fuzzyNameMatch(name1: string, name2: string): boolean {
    return normalizeName(name1) === normalizeName(name2);
}

/**
 * Extract first name from full name (first word)
 */
export function extractFirstName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || fullName;
}

/**
 * Extract last name from full name (heuristic: last word)
 */
export function extractLastName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || fullName;
}

/**
 * Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Similarity score between two name strings (0-100)
 * Handles diacritics, diminutives, and typos
 */
function nameSimilarity(input: string, candidate: string): number {
    if (!input || !candidate) return 0;
    const a = normalizeName(input);
    const b = normalizeName(candidate);
    if (a === b) return 100;

    // Check if one contains the other (handles "Tomek" vs "Tomasz")
    if (a.startsWith(b) || b.startsWith(a)) return 85;

    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    const dist = levenshteinDistance(a, b);
    const similarity = Math.round((1 - dist / maxLen) * 100);
    return Math.max(0, similarity);
}

export interface PatientMatchScore {
    score: number;       // 0-100 composite
    firstNameScore: number;
    lastNameScore: number;
    method: string;      // 'exact' | 'fuzzy' | 'partial' | 'none'
}

/**
 * Score a candidate patient against input first+last name
 * Returns composite score 0-100 with breakdown
 */
export function nameMatchScore(
    inputFirst: string,
    inputLast: string,
    candidateFirst: string,
    candidateLast: string
): PatientMatchScore {
    const lastScore = nameSimilarity(inputLast, candidateLast);
    const firstScore = nameSimilarity(inputFirst, candidateFirst);

    // Weighted: lastName 60%, firstName 40%
    const composite = Math.round(lastScore * 0.6 + firstScore * 0.4);

    let method = 'none';
    if (lastScore === 100 && firstScore === 100) method = 'exact';
    else if (lastScore >= 85 && firstScore >= 80) method = 'fuzzy';
    else if (lastScore >= 85) method = 'partial';

    return { score: composite, firstNameScore: firstScore, lastNameScore: lastScore, method };
}

export interface PatientCandidate {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    score: number;
    firstNameScore: number;
    lastNameScore: number;
    method: string;
}

/**
 * Find the best patient match from a list of candidates
 * Returns the best match (if any) with its score
 */
export function findBestPatientMatch(
    candidates: Array<{ id: string; firstName: string; lastName: string; phone?: string }>,
    inputFirst: string,
    inputLast: string
): { best: PatientCandidate | null; all: PatientCandidate[] } {
    if (!candidates || candidates.length === 0) return { best: null, all: [] };

    const scored: PatientCandidate[] = candidates.map(c => {
        const { score, firstNameScore, lastNameScore, method } = nameMatchScore(
            inputFirst, inputLast, c.firstName, c.lastName
        );
        return { ...c, score, firstNameScore, lastNameScore, method };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0] && scored[0].score >= 50 ? scored[0] : null;
    return { best, all: scored };
}

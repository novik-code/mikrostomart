// Potrójna weryfikacja końca pracy lekarza:
//  A. closedAt — lekarz zamknął wizytę
//  B. lastModifiedByDoctor — ostatnia modyfikacja wizyty przez lekarza
//  C. receptionCrossVerify — recepcja umówiła inną wizytę 3-15 min po
//     końcu pracy lekarza (= pacjent wyszedł, recepcja go obsługiwała)
//
// Jeśli A i C się zgadzają lub B i C się zgadzają → bumpuje confidence
// na "high-verified" (najwyższe). Pojedyncze A → "high", solo B → "medium",
// tylko scheduleEnd → "low".

import { prodentisFetch } from '@/lib/prodentisFetch';
import type { ProdentisWorkSummary } from './prodentisWorkSummary';

const CROSS_VERIFY_MIN_MS = 3 * 60_000;       // recepcja umawia ≥3 min po lekarzu
const CROSS_VERIFY_MAX_MS = 15 * 60_000;      // …i ≤15 min (potem niewiarygodne)

export type DoctorEndMethodName = 'closedAt' | 'lastModifiedByDoctor' | 'receptionCrossVerify' | 'scheduleEnd';
export type DoctorEndConfidence = 'high-verified' | 'high' | 'medium' | 'low' | 'unknown';

export interface DoctorEndMethod {
    name: DoctorEndMethodName;
    time: string | null;          // ISO
    confidence: 'high' | 'medium' | 'low';
    detail?: string;
}

export interface DoctorEndVerification {
    finalEndTime: string | null;
    finalConfidence: DoctorEndConfidence;
    methods: DoctorEndMethod[];
    crossVerified: boolean;
}

/**
 * Pobiera wszystkie wizyty dnia dla CAŁEJ kliniki — używane do cross-verify
 * przez timestamp `createdAt` wizyt umówionych przez recepcję po wizycie
 * lekarza (świadczy o aktywności recepcji w tym czasie).
 */
async function fetchAppointmentsByDate(date: string): Promise<Array<{
    id: string;
    createdAt: string | null;
    doctor: { id: string; name: string };
}>> {
    try {
        const res = await prodentisFetch(`/api/appointments/by-date?date=${date}`);
        if (!res.ok) return [];
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.appointments;
        return Array.isArray(list) ? list : [];
    } catch (e) {
        console.error('[doctorEndVerification] fetchAppointmentsByDate error:', e);
        return [];
    }
}

/**
 * Sprawdza czy recepcja była aktywna w oknie 3-15 min po podanym timestamie.
 * Bierze createdAt wszystkich wizyt dnia (nie tylko tego lekarza) — bo recepcja
 * po wyjściu pacjenta umawia mu KOLEJNĄ wizytę u dowolnego lekarza.
 */
function findReceptionActivityAfter(
    timestamp: string,
    appointments: Array<{ createdAt: string | null }>
): { found: boolean; receptionTime: string | null; deltaMs: number } {
    const refMs = new Date(timestamp).getTime();
    let bestDelta: number | null = null;
    let bestTime: string | null = null;

    for (const a of appointments) {
        if (!a.createdAt) continue;
        const created = new Date(a.createdAt).getTime();
        if (Number.isNaN(created)) continue;
        const delta = created - refMs;
        if (delta < CROSS_VERIFY_MIN_MS || delta > CROSS_VERIFY_MAX_MS) continue;
        if (bestDelta === null || delta < bestDelta) {
            bestDelta = delta;
            bestTime = a.createdAt;
        }
    }

    return {
        found: bestDelta !== null,
        receptionTime: bestTime,
        deltaMs: bestDelta ?? 0,
    };
}

/**
 * Główna funkcja: bierze work-summary lekarza + wizyty dnia, zwraca
 * potrójną weryfikację z finalnym czasem i confidence.
 */
export async function verifyDoctorEnd(
    summary: ProdentisWorkSummary,
    date: string
): Promise<DoctorEndVerification> {
    const methods: DoctorEndMethod[] = [];

    // ── METODA A: closedAt ostatniej wizyty ─────────────────────
    if (summary.lastClosedAt) {
        methods.push({
            name: 'closedAt',
            time: summary.lastClosedAt,
            confidence: 'high',
            detail: `Lekarz zamknął ostatnią wizytę o ${formatTime(summary.lastClosedAt)}`,
        });
    }

    // ── METODA B: lastModification by doctor ────────────────────
    if (summary.lastModificationByDoctor && summary.lastModificationByDoctor !== summary.lastClosedAt) {
        methods.push({
            name: 'lastModifiedByDoctor',
            time: summary.lastModificationByDoctor,
            confidence: 'medium',
            detail: `Ostatnia modyfikacja wizyty przez lekarza o ${formatTime(summary.lastModificationByDoctor)}`,
        });
    }

    // ── METODA C: cross-verify przez recepcję ───────────────────
    // Bierzemy najpóźniejszy z metod A/B i sprawdzamy createdAt wszystkich
    // wizyt dnia. Jeśli recepcja umówiła coś w 3-15 min po → potwierdzenie.
    let crossVerified = false;
    const refForCrossVerify = summary.lastClosedAt ?? summary.lastModificationByDoctor;
    if (refForCrossVerify) {
        const allAppts = await fetchAppointmentsByDate(date);
        const receptionCheck = findReceptionActivityAfter(refForCrossVerify, allAppts);
        if (receptionCheck.found && receptionCheck.receptionTime) {
            crossVerified = true;
            methods.push({
                name: 'receptionCrossVerify',
                time: receptionCheck.receptionTime,
                confidence: 'high',
                detail: `Recepcja umówiła kolejną wizytę o ${formatTime(receptionCheck.receptionTime)} (${Math.round(receptionCheck.deltaMs / 60000)} min po lekarzu) — potwierdzenie pacjent wyszedł`,
            });
        }
    }

    // ── METODA D (fallback): scheduleEnd ────────────────────────
    if (methods.length === 0 && summary.scheduleEnd) {
        // Konstruuj timestamp z scheduleEnd (HH:MM) na ten dzień
        const dt = new Date(`${date}T${summary.scheduleEnd}:00+02:00`);
        methods.push({
            name: 'scheduleEnd',
            time: dt.toISOString(),
            confidence: 'low',
            detail: `Tylko grafik (lekarz nic nie wpisywał) — koniec wg planu o ${summary.scheduleEnd}`,
        });
    }

    // ── Wybór finalny ───────────────────────────────────────────
    if (methods.length === 0) {
        return { finalEndTime: null, finalConfidence: 'unknown', methods: [], crossVerified: false };
    }

    // Priorytet: closedAt > lastModifiedByDoctor > scheduleEnd
    const closedMethod = methods.find((m) => m.name === 'closedAt');
    const modifiedMethod = methods.find((m) => m.name === 'lastModifiedByDoctor');
    const fallbackMethod = methods.find((m) => m.name === 'scheduleEnd');

    let finalTime: string | null;
    let finalConfidence: DoctorEndConfidence;

    if (closedMethod) {
        finalTime = closedMethod.time;
        finalConfidence = crossVerified ? 'high-verified' : 'high';
    } else if (modifiedMethod) {
        finalTime = modifiedMethod.time;
        finalConfidence = crossVerified ? 'high' : 'medium';   // bump z medium na high
    } else if (fallbackMethod) {
        finalTime = fallbackMethod.time;
        finalConfidence = 'low';
    } else {
        finalTime = null;
        finalConfidence = 'unknown';
    }

    return { finalEndTime: finalTime, finalConfidence, methods, crossVerified };
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
}

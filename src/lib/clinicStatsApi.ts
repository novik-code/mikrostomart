// Prodentis API → clinic stats helper.
//
// K-2c (2026-05-20): real-time statystyki procedur z bazy Prodentis500 zamiast
// hardcoded src/data/clinic-stats.ts. Endpointy publiczne (Prodentis v10.2):
//   GET /api/doctors/:id/procedure-stats
//   GET /api/clinic/procedure-stats
//
// Bezpieczeństwo + RODO:
// - Dane TYLKO agregowane (counts) — brak PII, brak nazwisk pacjentów
// - Doctor name field = "Marcin Nowosielski" — public info (wszędzie na stronie)
// - Endpoint Prodentis: bez API key, "dane marketingowe bez kwot"
// - Server-side fetch only (PRODENTIS_TUNNEL_URL nie w client bundle)
// - 8s timeout + automatic fallback Tunnel → direct IP (via prodentisFetch helper)
// - Demo mode skip → hardcoded fallback (per existing patterns)
// - Error handling: try/catch + zwraca hardcoded jeśli Prodentis down

import { prodentisFetch } from './prodentisFetch';
import { CLINIC_STATS as FALLBACK } from '@/data/clinic-stats';
import { isDemoMode } from './demoMode';

// Prodentis ID Marcina Nowosielskiego (per DLA_DEWELOPERA_STATYSTYKI_PROCEDUR.md)
const MARCIN_ID = '0100000001';

// ─────────────────────────────────────────────────────────────
// API response types (per docs)
// ─────────────────────────────────────────────────────────────
interface ProcedureCategories {
    implants: number;
    endodontics: number;
    reEndo: number;
    crowns: number;
    extractions: number;
    sinusLift: number;
    augmentation: number;
    softTissueGraft: number;
    fillings: number;
    resections: number;
    surgicalOther: number;
    hygiene: number;
}

interface DoctorStatsResponse {
    doctorId: string;
    doctorName: string;
    totalProcedures: number;
    totalPatients: number;
    activeSince: number;
    categories: ProcedureCategories;
}

interface ClinicStatsResponse {
    clinicName: string;
    totalDoctors: number;
    totalProcedures: number;
    totalPatients: number;
    activeSince: number;
    categories: ProcedureCategories;
}

// ─────────────────────────────────────────────────────────────
// Internal: fetch + map API response → our clinic-stats shape
// ─────────────────────────────────────────────────────────────
async function fetchDoctorStats(doctorId: string): Promise<DoctorStatsResponse | null> {
    try {
        const res = await prodentisFetch(`/api/doctors/${doctorId}/procedure-stats`);
        if (!res.ok) return null;
        return (await res.json()) as DoctorStatsResponse;
    } catch {
        return null;
    }
}

async function fetchClinicStatsRaw(): Promise<ClinicStatsResponse | null> {
    try {
        const res = await prodentisFetch('/api/clinic/procedure-stats');
        if (!res.ok) return null;
        return (await res.json()) as ClinicStatsResponse;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// Public: combined Marcin + clinic stats, mapped to internal shape
// ─────────────────────────────────────────────────────────────
export interface LiveClinicStats {
    lastUpdated: string; // ISO timestamp
    source: 'live' | 'fallback' | 'partial';
    foundedYear: number;
    yearsActive: number;
    marcin: {
        implants: number;
        rootCanals: number;
        rootCanalsReEndo: number;
        crowns: number;
        extractions: number;
        sinusLift: number;
        augmentations: number;
        softTissueGrafts: number;
        apicalResections: number;
        fillings: number;
        patients: number;
        procedures: number;
    };
    clinic: {
        implants: number;
        rootCanals: number;
        crowns: number;
        extractions: number;
        sinusLift: number;
        augmentations: number;
        softTissueGrafts: number;
        fillings: number;
        patients: number;
        procedures: number;
        doctors: number;
    };
}

/**
 * Buduje LiveClinicStats z fallback do hardcoded gdy API nie odpowiada.
 *
 * Source values:
 * - 'live'     — Marcin + clinic oba pobrane z Prodentis
 * - 'partial'  — jeden z dwóch endpointów odpowiedział, drugi fallback
 * - 'fallback' — całość z hardcoded src/data/clinic-stats.ts (Prodentis down lub demo)
 */
export async function getLiveClinicStats(): Promise<LiveClinicStats> {
    const now = new Date().toISOString();

    // Demo mode: zawsze fallback (per pattern istniejący w innych integrations)
    if (isDemoMode) {
        return buildFallback(now);
    }

    // Parallel fetch obu endpointów
    const [doctorData, clinicData] = await Promise.all([
        fetchDoctorStats(MARCIN_ID),
        fetchClinicStatsRaw(),
    ]);

    if (!doctorData && !clinicData) {
        return buildFallback(now);
    }

    const currentYear = new Date().getFullYear();
    const foundedYear = doctorData?.activeSince ?? clinicData?.activeSince ?? FALLBACK.foundedYear;

    return {
        lastUpdated: now,
        source: doctorData && clinicData ? 'live' : 'partial',
        foundedYear,
        yearsActive: currentYear - foundedYear,
        marcin: doctorData
            ? {
                implants: doctorData.categories.implants,
                rootCanals: doctorData.categories.endodontics,
                rootCanalsReEndo: doctorData.categories.reEndo,
                crowns: doctorData.categories.crowns,
                extractions: doctorData.categories.extractions,
                sinusLift: doctorData.categories.sinusLift,
                augmentations: doctorData.categories.augmentation,
                softTissueGrafts: doctorData.categories.softTissueGraft,
                apicalResections: doctorData.categories.resections,
                fillings: doctorData.categories.fillings,
                patients: doctorData.totalPatients,
                procedures: doctorData.totalProcedures,
            }
            : FALLBACK.marcin,
        clinic: clinicData
            ? {
                implants: clinicData.categories.implants,
                rootCanals: clinicData.categories.endodontics,
                crowns: clinicData.categories.crowns,
                extractions: clinicData.categories.extractions,
                sinusLift: clinicData.categories.sinusLift,
                augmentations: clinicData.categories.augmentation,
                softTissueGrafts: clinicData.categories.softTissueGraft,
                fillings: clinicData.categories.fillings,
                patients: clinicData.totalPatients,
                procedures: clinicData.totalProcedures,
                doctors: clinicData.totalDoctors,
            }
            : FALLBACK.clinic,
    };
}

function buildFallback(timestamp: string): LiveClinicStats {
    return {
        lastUpdated: timestamp,
        source: 'fallback',
        foundedYear: FALLBACK.foundedYear,
        yearsActive: FALLBACK.yearsActive,
        marcin: FALLBACK.marcin,
        clinic: FALLBACK.clinic,
    };
}

// Pobranie work-summary lekarza z Prodentis API v10.
// Zwraca estimatedWorkEnd (najlepszy szacunek końca pracy lekarza dnia)
// + confidence high/medium/low + lastClosedAt + appointment counts.

import { prodentisFetch } from '@/lib/prodentisFetch';

export interface ProdentisWorkSummary {
    doctorId: string;
    doctorName: string;
    date: string;                                        // YYYY-MM-DD
    appointmentsCount: number;
    appointmentsWithVisitRecord: number;
    appointmentsClosed: number;
    scheduleEnd: string | null;                          // HH:MM
    lastModificationByDoctor: string | null;             // ISO
    lastClosedAt: string | null;                         // ISO
    estimatedWorkEnd: string | null;                     // ISO — nasz „doctor_end_time"
    confidence: 'high' | 'medium' | 'low';
    totalRevenue: number | null;
    appointments: Array<{
        id: string;
        source: 'scheduler' | 'visit';
        startTime: string | null;
        endTime: string | null;
        hasVisitRecord: boolean;
        visitModifiedAt: string | null;
        closedAt: string | null;
        price: number | null;
    }>;
}

/**
 * Pobiera work-summary jednego lekarza za dany dzień.
 * Zwraca null jeśli endpoint zwrócił błąd lub puste dane.
 */
export async function fetchDoctorWorkSummary(
    prodentisDoctorId: string,
    date: string
): Promise<ProdentisWorkSummary | null> {
    if (!prodentisDoctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    try {
        const res = await prodentisFetch(`/api/doctors/${prodentisDoctorId}/work-summary?date=${date}`);
        if (!res.ok) {
            console.error(`[prodentisWorkSummary] HTTP ${res.status} for doctor=${prodentisDoctorId} date=${date}`);
            return null;
        }
        const data = await res.json();
        // Walidacja kluczowych pól
        if (!data || typeof data !== 'object' || !data.doctorId) {
            console.error(`[prodentisWorkSummary] invalid response shape for doctor=${prodentisDoctorId}`);
            return null;
        }
        return data as ProdentisWorkSummary;
    } catch (err) {
        console.error(`[prodentisWorkSummary] error doctor=${prodentisDoctorId}:`, err);
        return null;
    }
}

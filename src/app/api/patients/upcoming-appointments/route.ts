import { NextResponse, NextRequest } from 'next/server';
import { verifyTokenFromRequest } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/patients/upcoming-appointments
 * 
 * Returns all FUTURE appointments for the authenticated patient.
 * Uses the new Prodentis v9.1 endpoint: GET /api/patient/:id/future-appointments
 */
export async function GET(request: NextRequest) {
    try {
        
        const payload = verifyTokenFromRequest(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = `${PRODENTIS_API}/api/patient/${payload.prodentisId}/future-appointments?days=180`;
        console.log('[UpcomingAppointments] Fetching:', url);

        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error('[UpcomingAppointments] Prodentis error:', response.status);
            return NextResponse.json({ appointments: [] });
        }

        const data = await response.json();
        const appointments = data.appointments || [];

        console.log('[UpcomingAppointments] Found', appointments.length, 'future appointment(s)');

        // Map to the expected format (already sorted by date from API)
        const mapped = appointments.map((apt: any) => ({
            scheduleId: apt.id,
            date: apt.date,
            endDate: (() => {
                const start = new Date(apt.date);
                start.setMinutes(start.getMinutes() + (apt.duration || 30));
                return start.toISOString();
            })(),
            doctor: apt.doctor || {},
            duration: apt.duration || 30,
        }));

        return NextResponse.json({ appointments: mapped });

    } catch (error: any) {
        console.error('[UpcomingAppointments] Error:', error);
        return NextResponse.json({ appointments: [] });
    }
}

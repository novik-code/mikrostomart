import { NextResponse, NextRequest } from 'next/server';
import { verifyPatientSession } from '@/lib/jwt';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

/**
 * GET /api/patients/upcoming-appointments
 * 
 * Returns all FUTURE appointments for the authenticated patient.
 * Uses the new Prodentis v9.1 endpoint: GET /api/patient/:id/future-appointments
 */
export async function GET(request: NextRequest) {
    try {
        
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const path = `/api/patient/${payload.prodentisId}/future-appointments?days=180`;
        console.log('[UpcomingAppointments] Fetching:', path);

        const response = await prodentisFetch(path);

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

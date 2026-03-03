import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/patients/upcoming-appointments
 * Returns all FUTURE appointments for the authenticated patient from Prodentis.
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all appointments from Prodentis (same endpoint used by employee/patient-appointments)
        const url = `${PRODENTIS_API}/api/patient/${payload.prodentisId}/appointments?limit=100`;
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
        const allAppointments = data.appointments || [];

        console.log('[UpcomingAppointments] Total appointments from Prodentis:', allAppointments.length);

        // Filter to future appointments only (use start of today as cutoff)
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcoming = allAppointments
            .filter((apt: any) => {
                const aptDate = new Date(apt.date);
                return aptDate >= now;
            })
            .sort((a: any, b: any) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map((apt: any) => ({
                scheduleId: apt.id || null,
                date: apt.date,
                endDate: apt.endDate || apt.date,
                doctor: apt.doctor || {},
                cost: apt.cost || 0,
                paid: apt.paid || 0,
            }));

        console.log('[UpcomingAppointments] Future appointments found:', upcoming.length);

        return NextResponse.json({ appointments: upcoming });

    } catch (error: any) {
        console.error('[UpcomingAppointments] Error:', error);
        return NextResponse.json({ appointments: [] });
    }
}

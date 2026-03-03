import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

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

        // Fetch all appointments from Prodentis
        const url = `${PRODENTIS_API}/api/patient/${payload.prodentisId}/appointments?limit=50&offset=0`;
        console.log('[UpcomingAppointments] Fetching:', url);

        const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error('[UpcomingAppointments] Prodentis error:', response.status);
            return NextResponse.json({ appointments: [] });
        }

        const data = await response.json();
        const allAppointments = data.appointments || [];

        // Filter only FUTURE appointments
        const now = new Date();
        const upcoming = allAppointments.filter((apt: any) => {
            const aptDate = new Date(apt.date);
            return aptDate > now;
        });

        // Sort by date ascending (soonest first)
        upcoming.sort((a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Map to include schedule appointment ID
        const mapped = upcoming.map((apt: any) => ({
            // The actual Prodentis schedule appointment ID
            scheduleId: apt.id || null,
            date: apt.date,
            endDate: apt.endDate,
            doctor: apt.doctor || {},
            cost: apt.cost || 0,
            paid: apt.paid || 0,
        }));

        return NextResponse.json({ appointments: mapped });

    } catch (error: any) {
        console.error('[UpcomingAppointments] Error:', error);
        return NextResponse.json({ appointments: [] });
    }
}

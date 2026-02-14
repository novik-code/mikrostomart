import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/employee/patient-appointments?patientId={prodentisId}
 * 
 * Fetches FUTURE appointments for a patient from Prodentis.
 * Scans 60 days forward from today.
 * Used to suggest due dates when creating tasks.
 */
export async function GET(req: Request) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId');

    if (!patientId) {
        return NextResponse.json({ error: 'Missing patientId parameter' }, { status: 400 });
    }

    try {
        // Fetch patient's full appointment history from Prodentis
        const apiUrl = `${PRODENTIS_API_URL}/api/patient/${patientId}/appointments?limit=100`;
        const response = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            console.error(`[PatientAppointments] Prodentis API error: ${response.status}`);
            return NextResponse.json(
                { error: 'Failed to fetch appointments' },
                { status: 500 }
            );
        }

        const data = await response.json();
        const allAppointments = data.appointments || [];

        // Filter to future appointments only
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const futureAppointments = allAppointments
            .filter((apt: any) => {
                const aptDate = new Date(apt.date);
                return aptDate >= now;
            })
            .map((apt: any) => ({
                id: apt.id,
                date: apt.date,
                endDate: apt.endDate || null,
                doctor: apt.doctor,
                appointmentType: apt.appointmentType || apt.type || 'Wizyta',
                duration: apt.duration || null,
            }))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({ appointments: futureAppointments });

    } catch (error: any) {
        console.error('[PatientAppointments] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/patients/appointments/bookings
 * JWT auth — returns patient's online_bookings by prodentis_patient_id
 */
export async function GET(req: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(req);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch bookings by prodentis_patient_id
        const { data: bookings, error } = await supabase
            .from('online_bookings')
            .select('id, patient_name, specialist_name, appointment_date, appointment_time, service_type, schedule_status, description, created_at')
            .eq('prodentis_patient_id', payload.prodentisId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('[PatientBookings] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ bookings: bookings || [] });
    } catch (err: any) {
        console.error('[PatientBookings] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

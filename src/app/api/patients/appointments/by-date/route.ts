import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import type { AppointmentAction } from '@/types/appointmentActions';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json(
                { error: 'Date parameter required' },
                { status: 400 }
            );
        }

        // Verify JWT
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get patient record using prodentisId from token
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Find appointment action by date (use range to handle format differences)
        const searchDate = new Date(date);
        const rangeStart = new Date(searchDate.getTime() - 60000); // 1 min before
        const rangeEnd = new Date(searchDate.getTime() + 60000);   // 1 min after

        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('patient_id', patient.id)
            .gte('appointment_date', rangeStart.toISOString())
            .lt('appointment_date', rangeEnd.toISOString())
            .limit(1)
            .single();

        if (actionError || !action) {
            return NextResponse.json(
                { error: 'Appointment action not found' },
                { status: 404 }
            );
        }

        const appointmentAction = action as AppointmentAction;

        return NextResponse.json(appointmentAction);

    } catch (error) {
        console.error('Error fetching appointment action by date:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

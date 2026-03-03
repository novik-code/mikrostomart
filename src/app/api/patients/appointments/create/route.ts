import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TERMINAL_STATUSES = ['cancelled', 'rescheduled', 'cancellation_pending', 'reschedule_pending'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prodentis_id, appointment_date, appointment_end_date, doctor_id, doctor_name, schedule_appointment_id } = body;

        // Verify JWT
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get patient record
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Check if an action already exists for this patient + date (±2 min window)
        const searchDate = new Date(appointment_date);
        const rangeStart = new Date(searchDate.getTime() - 120000);
        const rangeEnd = new Date(searchDate.getTime() + 120000);

        const { data: existing } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('patient_id', patient.id)
            .gte('appointment_date', rangeStart.toISOString())
            .lt('appointment_date', rangeEnd.toISOString())
            .limit(1)
            .maybeSingle();

        if (existing) {
            if (TERMINAL_STATUSES.includes(existing.status)) {
                // Appointment still exists in Prodentis → DELETE old record and CREATE fresh
                console.log('[Create] Deleting stale record', existing.id, 'with status:', existing.status);

                const { error: deleteError } = await supabase
                    .from('appointment_actions')
                    .delete()
                    .eq('id', existing.id);

                if (deleteError) {
                    console.error('[Create] Delete failed:', deleteError);
                    // Fall through — try to return existing anyway
                    return NextResponse.json({ id: existing.id, status: existing.status });
                }

                // Create fresh record
                const { data: fresh, error: freshError } = await supabase
                    .from('appointment_actions')
                    .insert({
                        patient_id: patient.id,
                        prodentis_id: schedule_appointment_id || prodentis_id || patient.prodentis_id,
                        appointment_date,
                        appointment_end_date,
                        doctor_id,
                        doctor_name,
                        status: 'unpaid_reservation',
                        deposit_paid: false,
                        attendance_confirmed: false,
                        cancellation_requested: false,
                        reschedule_requested: false
                    })
                    .select()
                    .single();

                if (freshError) {
                    console.error('[Create] Re-create failed:', freshError);
                    return NextResponse.json({ error: 'Failed to reset appointment' }, { status: 500 });
                }

                console.log('[Create] Fresh record created:', fresh.id, 'status:', fresh.status);
                return NextResponse.json({ id: fresh.id, status: fresh.status, wasReset: true });
            }

            // Non-terminal status → return existing as-is
            return NextResponse.json({ id: existing.id, status: existing.status });
        }

        // No existing record → create new
        const { data: action, error: createError } = await supabase
            .from('appointment_actions')
            .insert({
                patient_id: patient.id,
                prodentis_id: schedule_appointment_id || prodentis_id || patient.prodentis_id,
                appointment_date,
                appointment_end_date,
                doctor_id,
                doctor_name,
                status: 'unpaid_reservation',
                deposit_paid: false,
                attendance_confirmed: false,
                cancellation_requested: false,
                reschedule_requested: false
            })
            .select()
            .single();

        if (createError) {
            if (createError.code === '23505') {
                // Race condition — try to find and return
                const { data: raceExisting } = await supabase
                    .from('appointment_actions')
                    .select('id, status')
                    .eq('patient_id', patient.id)
                    .gte('appointment_date', rangeStart.toISOString())
                    .lt('appointment_date', rangeEnd.toISOString())
                    .limit(1)
                    .maybeSingle();
                if (raceExisting) {
                    return NextResponse.json({ id: raceExisting.id, status: raceExisting.status });
                }
            }
            throw createError;
        }

        return NextResponse.json({ id: action.id, status: action.status });

    } catch (error) {
        console.error('[Create] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

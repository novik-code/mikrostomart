import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TERMINAL_STATUSES = ['cancelled', 'rescheduled', 'cancellation_pending', 'reschedule_pending'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prodentis_id, appointment_date, appointment_end_date, doctor_id, doctor_name, schedule_appointment_id } = body;

        
        const payload = verifyTokenFromRequest(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Search for existing record: by schedule_appointment_id (prodentis_id field) OR by date range
        const searchDate = new Date(appointment_date);
        const rangeStart = new Date(searchDate.getTime() - 120000);
        const rangeEnd = new Date(searchDate.getTime() + 120000);

        // Strategy 1: Find by schedule appointment ID
        let existing: any = null;
        if (schedule_appointment_id) {
            const { data } = await supabase
                .from('appointment_actions')
                .select('*')
                .eq('patient_id', patient.id)
                .eq('prodentis_id', schedule_appointment_id)
                .maybeSingle();
            existing = data;
        }

        // Strategy 2: Find by date range
        if (!existing) {
            const { data } = await supabase
                .from('appointment_actions')
                .select('*')
                .eq('patient_id', patient.id)
                .gte('appointment_date', rangeStart.toISOString())
                .lt('appointment_date', rangeEnd.toISOString())
                .limit(1)
                .maybeSingle();
            existing = data;
        }

        if (existing) {
            if (TERMINAL_STATUSES.includes(existing.status)) {
                // Delete the stale record
                console.log('[Create] Deleting stale record', existing.id, 'status:', existing.status, 'date:', existing.appointment_date);
                await supabase.from('appointment_actions').delete().eq('id', existing.id);

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
                    console.error('[Create] Re-create error:', JSON.stringify(freshError));
                    // If insert fails, the old record was already deleted.
                    // Try to return what we can — the insert might fail due to another stale record
                    // for the same patient. Clean ALL terminal records for this patient and try again.
                    console.log('[Create] Cleaning ALL terminal records for patient', patient.id);
                    await supabase
                        .from('appointment_actions')
                        .delete()
                        .eq('patient_id', patient.id)
                        .in('status', TERMINAL_STATUSES);

                    // Retry insert
                    const { data: retryFresh, error: retryError } = await supabase
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

                    if (retryError) {
                        console.error('[Create] Retry also failed:', JSON.stringify(retryError));
                        return NextResponse.json({ error: 'Failed to reset appointment', detail: retryError.message }, { status: 500 });
                    }

                    return NextResponse.json({ id: retryFresh.id, status: retryFresh.status, wasReset: true });
                }

                console.log('[Create] Fresh record created:', fresh.id);
                return NextResponse.json({ id: fresh.id, status: fresh.status, wasReset: true });
            }

            // Non-terminal status — return existing as-is
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
            console.error('[Create] Insert error:', JSON.stringify(createError));
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

    } catch (error: any) {
        console.error('[Create] Error:', error);
        return NextResponse.json({ error: 'Internal server error', detail: error?.message }, { status: 500 });
    }
}

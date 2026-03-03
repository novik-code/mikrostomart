import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

        // Get patient record using prodentisId from token
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // First, check if an action already exists for this patient + appointment date
        // Use a broad range to handle timestamp format differences
        const searchDate = new Date(appointment_date);
        const rangeStart = new Date(searchDate.getTime() - 120000); // 2 min before
        const rangeEnd = new Date(searchDate.getTime() + 120000);   // 2 min after

        const { data: existing } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('patient_id', patient.id)
            .gte('appointment_date', rangeStart.toISOString())
            .lt('appointment_date', rangeEnd.toISOString())
            .limit(1)
            .maybeSingle();

        if (existing) {
            const terminalStatuses = ['cancelled', 'rescheduled', 'cancellation_pending', 'reschedule_pending'];

            if (terminalStatuses.includes(existing.status)) {
                // Appointment still exists in Prodentis schedule → reset status
                console.log('[Create] Resetting terminal status', existing.status, '→ unpaid_reservation for', appointment_date);
                const { data: updated } = await supabase
                    .from('appointment_actions')
                    .update({
                        status: 'unpaid_reservation',
                        cancellation_requested: false,
                        reschedule_requested: false,
                        prodentis_id: schedule_appointment_id || existing.prodentis_id,
                        appointment_date,
                        appointment_end_date: appointment_end_date || existing.appointment_end_date,
                        doctor_id: doctor_id || existing.doctor_id,
                        doctor_name: doctor_name || existing.doctor_name,
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                return NextResponse.json({
                    id: updated?.id || existing.id,
                    status: updated?.status || 'unpaid_reservation',
                    wasReset: true,
                });
            }

            // Non-terminal status — return existing record as-is
            console.log('[Create] Existing action found for', appointment_date, 'status:', existing.status);
            return NextResponse.json({
                id: existing.id,
                status: existing.status,
            });
        }

        // No existing record — create new one
        const schedId = schedule_appointment_id || prodentis_id || patient.prodentis_id;
        const { data: action, error: createError } = await supabase
            .from('appointment_actions')
            .insert({
                patient_id: patient.id,
                prodentis_id: schedId,
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
            // If insert still fails (race condition), try to find and return existing
            if (createError.code === '23505') {
                console.log('[Create] Race condition — record created between check and insert for', appointment_date);
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

        console.log('[Create] New action created for', appointment_date, 'id:', action.id);
        return NextResponse.json({ id: action.id, status: action.status });

    } catch (error) {
        console.error('[Create] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

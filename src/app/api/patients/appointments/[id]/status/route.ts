import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { AppointmentAction, AppointmentStatusResponse } from '@/types/appointmentActions';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;

        // Get JWT token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);

        // Verify JWT and get patient data
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }

        // Get patient record
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id')
            .eq('id', user.id)
            .single();

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        // Get appointment action record
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient.id) // Security: ensure patient owns this appointment
            .single();

        if (actionError || !action) {
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        const appointmentAction = action as AppointmentAction;

        // Calculate hours until appointment
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Determine if can confirm attendance (must be <24h before appointment)
        const canConfirmAttendance = hoursUntil > 0 && hoursUntil <= 24 && !appointmentAction.attendance_confirmed;

        // Build response
        const response: AppointmentStatusResponse = {
            status: appointmentAction.status,
            depositPaid: appointmentAction.deposit_paid,
            depositAmount: appointmentAction.deposit_amount,
            attendanceConfirmed: appointmentAction.attendance_confirmed,
            cancellationPending: appointmentAction.cancellation_requested,
            reschedulePending: appointmentAction.reschedule_requested,
            hoursUntilAppointment: Math.round(hoursUntil * 10) / 10, // Round to 1 decimal
            canConfirmAttendance,
            actions: {
                canPayDeposit: !appointmentAction.deposit_paid && hoursUntil > 0,
                canConfirmAttendance,
                canCancel: hoursUntil > 0 && !appointmentAction.cancellation_requested,
                canReschedule: hoursUntil > 0 && !appointmentAction.reschedule_requested
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching appointment status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

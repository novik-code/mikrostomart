import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import type { AppointmentAction, AppointmentStatusResponse } from '@/types/appointmentActions';
import {
    czyGabinetProsiOPotwierdzenie,
    czyWizytaOdwolana,
    czyWizytaPotwierdzonaGdziekolwiek,
    oknoPotwierdzeniaH,
} from '@/lib/blokadaPotwierdzonejWizyty';

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

        // Verify JWT
        
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get patient record using prodentisId from token
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id')
            .eq('prodentis_id', payload.prodentisId)
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

        /**
         * 🔒 18.09.2026: potwierdzenie = deklaracja obecności. Potwierdzona (w KTÓRYMKOLWIEK wierszu
         * tej wizyty) → bez odwołania i przełożenia. Zgłoszone odwołanie (link/push/strefa, trwała
         * flaga) → bez potwierdzenia, a panel pokazuje „odwołanie zgłoszone” (`cancellationPending`).
         * Zgłoszenie wygrywa z potwierdzeniem — oba naraz mają tylko wiersze sprzed 18.09.
         */
        const odwolana = czyWizytaOdwolana(appointmentAction);
        const zablokowana = !odwolana && (await czyWizytaPotwierdzonaGdziekolwiek(supabase, appointmentAction));

        // Potwierdzenie: 24 h przed wizytą, a po prośbie gabinetu (przypomnienie z linkiem) — jak link, 7 dni.
        const canConfirmAttendance = hoursUntil > 0
            && hoursUntil <= oknoPotwierdzeniaH(appointmentAction)
            && !appointmentAction.attendance_confirmed
            && !odwolana;
        /** Gabinet poprosił o potwierdzenie, a pacjent jeszcze nie odpowiedział (addytywnie, 18.09). */
        const confirmationRequested = hoursUntil > 0
            && czyGabinetProsiOPotwierdzenie(appointmentAction)
            && !appointmentAction.attendance_confirmed
            && !odwolana;

        // Build response
        const response: AppointmentStatusResponse = {
            status: appointmentAction.status,
            depositPaid: appointmentAction.deposit_paid,
            depositAmount: appointmentAction.deposit_amount,
            attendanceConfirmed: appointmentAction.attendance_confirmed,
            cancellationPending: appointmentAction.cancellation_requested === true || odwolana,
            reschedulePending: appointmentAction.reschedule_requested,
            hoursUntilAppointment: Math.round(hoursUntil * 10) / 10, // Round to 1 decimal
            canConfirmAttendance,
            confirmationRequested,
            // 🔒 Addytywnie (18.09.2026): potwierdzonej wizyty nie da się odwołać ani przełożyć.
            lockedAfterConfirmation: zablokowana,
            actions: {
                canPayDeposit: !appointmentAction.deposit_paid && hoursUntil > 0,
                canConfirmAttendance,
                canCancel: hoursUntil > 0 && !zablokowana && !odwolana,
                canReschedule: hoursUntil > 0 && !zablokowana && !appointmentAction.reschedule_requested
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

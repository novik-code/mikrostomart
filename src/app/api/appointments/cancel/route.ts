import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { cancelCareflowForAppointment } from '@/lib/careflowLifecycle';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Dane pacjenta — nic nie może osiąść w cache CDN ani przeglądarki. */
const NO_STORE: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

/**
 * POST /api/appointments/cancel
 * 
 * Public endpoint for appointment cancellation from landing pages (SMS links)
 * No JWT required - validates via appointmentId + patientId matching
 */
export async function POST(req: NextRequest) {
    try {
        const { appointmentId, token, patientId, prodentisId } = await req.json();

        // S4-4: accept token (new) or appointmentId (legacy, 14-day grace).
        if (!token && !appointmentId) {
            return NextResponse.json(
                { error: 'Missing token or appointmentId' },
                { status: 400, headers: NO_STORE }
            );
        }

        console.log('[CANCEL-PUBLIC] Attempting cancellation:', {
            lookup: token ? 'token' : 'appointmentId (legacy)',
            patientId,
            prodentisId,
        });

        const query = supabase
            .from('appointment_actions')
            .select('*');
        const { data: action, error: actionError } = await (token
            ? query.eq('confirmation_token', token).single()
            : query.eq('id', appointmentId).single());

        if (actionError || !action) {
            console.error('[CANCEL-PUBLIC] Appointment not found:', actionError);
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404, headers: NO_STORE }
            );
        }

        // Keep downstream code using action.id (which is what the DB
        // expects for further updates).
        const resolvedAppointmentId = action.id;

        console.log('[CANCEL-PUBLIC] Found appointment:', {
            id: action.id,
            status: action.status
        });

        // Check if already cancelled - return success (not error)
        if (action.status === 'cancelled' || action.status === 'reschedule_requested') {
            console.log('[CANCEL-PUBLIC] Already cancelled - returning success');
            return NextResponse.json({
                success: true,
                alreadyCancelled: true,
                message: 'Wizyta została już wcześniej odwołana.'
            }, { headers: NO_STORE });
        }

        // Validate timing (must be > 2 hours before appointment)
        const appointmentDate = new Date(action.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntil < 0) {
            return NextResponse.json(
                { error: 'Appointment has passed' },
                { status: 400, headers: NO_STORE }
            );
        }

        if (hoursUntil < 2) {
            return NextResponse.json(
                { error: 'Cancellation must be at least 2 hours before appointment' },
                { status: 400, headers: NO_STORE }
            );
        }

        // Update appointment action to cancelled
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                status: 'reschedule_requested',
                reschedule_requested_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', resolvedAppointmentId);

        if (updateError) {
            console.error('[CANCEL-PUBLIC] Update error:', updateError);
            throw updateError;
        }

        // Get patient details (may be null if patient has no account)
        // prodentis_id: care_enrollments.patient_id trzyma ID kartoteki, a nie UUID konta
        let patient = null;
        if (action.patient_id) {
            const { data } = await supabase
                .from('patients')
                .select('phone, prodentis_id')
                .eq('id', action.patient_id)
                .single();
            patient = data;
        }

        // ── Zamknij CareFlow odwołanego zabiegu ──
        // Bez tego cron dalej przypomina o lekach do zabiegu, który się nie odbędzie.
        // Awaited, bo praca po zwróceniu odpowiedzi nie jest na Vercelu gwarantowana;
        // helper sam łapie wszystkie błędy, więc nie wywróci odwołania wizyty.
        const careflow = await cancelCareflowForAppointment({
            appointmentId: action.prodentis_id || undefined,
            prodentisId: patient?.prodentis_id || undefined,
            appointmentDate: action.appointment_date,
            actor: 'patient',
            reason: 'Wizyta odwołana przez pacjenta (link z SMS)',
        });

        // Niejednoznaczne dopasowanie = ŻADEN protokół nie został zamknięty, więc cron dalej
        // przypomina o osłonie antybiotykowej do zabiegu, którego nie będzie. Alarm dla personelu
        // (Telegram + push) wysyła sam helper — jedno źródło, żeby nie dublować go z trzech tras.
        // Tu dokładamy tylko powiązanie z wizytą w portalu, którego helper nie zna (ma ID Prodentisa).
        if (careflow.ambiguousEnrollmentIds.length > 0) {
            console.warn(
                `[CANCEL-PUBLIC] CareFlow wymaga ręcznej decyzji — wizyta portalu ${resolvedAppointmentId}, ` +
                `zapisy: ${careflow.ambiguousEnrollmentIds.join(', ')}`
            );
        }

        // Format dates for notifications
        const appointmentDateFormatted = appointmentDate.toLocaleDateString('pl-PL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const appointmentTime = appointmentDate.toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Send Telegram notification
        let telegramSent = false;
        try {
            const telegramMessage = `❌ <b>PACJENT ODWOŁAŁ WIZYTĘ</b>\\\\n\\\\n` +
                `👤 <b>Pacjent:</b> ${action.patient_name || 'Nieznany pacjent'}\\\\n` +
                `📞 <b>Telefon:</b> <a href="tel:${action.patient_phone}">${action.patient_phone || 'Brak'}</a>\\\\n` +
                `📅 <b>Data:</b> ${appointmentDateFormatted}\\\\n` +
                `⏰ <b>Godzina:</b> ${appointmentTime}\\\\n` +
                `🩺 <b>Lekarz:</b> ${action.doctor_name || 'Nie podano'}\\\\n\\\\n` +
                `⚠️ <i>Proszę skontaktować się z pacjentem</i>`;

            telegramSent = await sendTelegramNotification(telegramMessage, 'appointments');
        } catch (telegramError) {
            console.error('[CANCEL-PUBLIC] Failed to send telegram:', telegramError);
        }

        // Push notification to admins and employees
        const pushParams = {
            patient: action.patient_name || 'Pacjent',
            date: appointmentDateFormatted,
            time: appointmentTime,
            doctor: action.doctor_name || '',
        };
        broadcastPush('admin', 'appointment_cancelled', pushParams, '/admin', { alsoApp: true }).catch(console.error);
        broadcastPush('employee', 'appointment_cancelled', pushParams, '/pracownik', { alsoApp: true }).catch(console.error);

        console.log('[CANCEL-PUBLIC] Success:', { telegramSent });

        return NextResponse.json({
            success: true,
            message: 'Odwołanie wysłane. Gabinet został powiadomiony i skontaktuje się z Tobą.',
            telegramSent
        }, { headers: NO_STORE });

    } catch (error) {
        console.error('[CANCEL-PUBLIC] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: NO_STORE }
        );
    }
}

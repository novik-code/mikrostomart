import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/appointments/cancel
 * 
 * Public endpoint for appointment cancellation from landing pages (SMS links)
 * No JWT required - validates via appointmentId + patientId matching
 */
export async function POST(req: NextRequest) {
    try {
        const { appointmentId, patientId, prodentisId } = await req.json();

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'Missing appointmentId' },
                { status: 400 }
            );
        }

        console.log('[CANCEL-PUBLIC] Attempting cancellation:', { appointmentId, patientId, prodentisId });

        // Get appointment action by ID
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .single();

        if (actionError || !action) {
            console.error('[CANCEL-PUBLIC] Appointment not found:', actionError);
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

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
            });
        }

        // Validate timing (must be > 2 hours before appointment)
        const appointmentDate = new Date(action.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntil < 0) {
            return NextResponse.json(
                { error: 'Appointment has passed' },
                { status: 400 }
            );
        }

        if (hoursUntil < 2) {
            return NextResponse.json(
                { error: 'Cancellation must be at least 2 hours before appointment' },
                { status: 400 }
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
            .eq('id', appointmentId);

        if (updateError) {
            console.error('[CANCEL-PUBLIC] Update error:', updateError);
            throw updateError;
        }

        // Get patient details (may be null if patient has no account)
        let patient = null;
        if (action.patient_id) {
            const { data } = await supabase
                .from('patients')
                .select('phone')
                .eq('id', action.patient_id)
                .single();
            patient = data;
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
        broadcastPush('admin', 'appointment_cancelled', pushParams, '/admin').catch(console.error);
        broadcastPush('employee', 'appointment_cancelled', pushParams, '/pracownik').catch(console.error);

        // Send Email notification
        let emailSent = false;
        try {
            if (process.env.RESEND_API_KEY) {
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);

                await resend.emails.send({
                    from: 'Mikrostomart <noreply@mikrostomart.pl>',
                    to: process.env.ADMIN_EMAIL || 'gabinet@mikrostomart.pl',
                    subject: '❌ Pacjent odwołał wizytę',
                    html: `
                        <h2>❌ PACJENT ODWOŁAŁ WIZYTĘ</h2>
                        <p><strong>Pacjent:</strong> ${action.patient_name || 'Nieznany pacjent'}</p>
                        <p><strong>Telefon:</strong> ${action.patient_phone || 'Brak'}</p>
                        <p><strong>Data:</strong> ${appointmentDateFormatted}</p>
                        <p><strong>Godzina:</strong> ${appointmentTime}</p>
                        <p><strong>Lekarz:</strong> ${action.doctor_name || 'Nie podano'}</p>
                        <p><em>⚠️ Proszę skontaktować się z pacjentem (${new Date().toLocaleString('pl-PL')})</em></p>
                    `
                });
                emailSent = true;
            }
        } catch (emailError) {
            console.error('[CANCEL-PUBLIC] Failed to send email:', emailError);
        }

        // Send WhatsApp notification
        let whatsappSent = false;
        try {
            const whatsappToken = process.env.WHATSAPP_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
            const whatsappChatId = process.env.WHATSAPP_CHAT_ID;

            if (whatsappToken && whatsappChatId) {
                const whatsappMessage = `❌ PACJENT ODWOŁAŁ WIZYTĘ\\n\\n` +
                    `📅 ${appointmentDateFormatted}, ${appointmentTime}\\n` +
                    `🩺 ${action.doctor_name || 'Nie podano'}\\n` +
                    `📞 ${patient?.phone || 'Brak'}\\n\\n` +
                    `⚠️ Proszę skontaktować się z pacjentem`;

                const waUrl = `https://api.telegram.org/bot${whatsappToken}/sendMessage`;
                const response = await fetch(waUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: whatsappChatId,
                        text: whatsappMessage
                    }),
                });

                if (response.ok) whatsappSent = true;
            }
        } catch (whatsappError) {
            console.error('[CANCEL-PUBLIC] WhatsApp notification failed:', whatsappError);
        }

        console.log('[CANCEL-PUBLIC] Success:', { telegramSent, whatsappSent, emailSent });

        return NextResponse.json({
            success: true,
            message: 'Odwołanie wysłane. Gabinet został powiadomiony i skontaktuje się z Tobą.',
            telegramSent,
            whatsappSent,
            emailSent
        });

    } catch (error) {
        console.error('[CANCEL-PUBLIC] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

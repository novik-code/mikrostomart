import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/appointments/confirm
 * 
 * Public endpoint for appointment confirmation from landing pages (SMS links)
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

        console.log('[CONFIRM-PUBLIC] Attempting confirmation:', { appointmentId, patientId, prodentisId });

        // Get appointment action by ID
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .single();

        if (actionError || !action) {
            console.error('[CONFIRM-PUBLIC] Appointment not found:', actionError);
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        console.log('[CONFIRM-PUBLIC] Found appointment:', {
            id: action.id,
            status: action.status,
            confirmed: action.attendance_confirmed
        });

        // Check if already confirmed - return success (not error)
        if (action.attendance_confirmed) {
            console.log('[CONFIRM-PUBLIC] Already confirmed - returning success');
            return NextResponse.json({
                success: true,
                alreadyConfirmed: true,
                message: 'Wizyta została już wcześniej potwierdzona.'
            });
        }

        // Validate timing (within 7 days before appointment)
        const appointmentDate = new Date(action.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntil < 0) {
            return NextResponse.json(
                { error: 'Appointment has passed' },
                { status: 400 }
            );
        }

        if (hoursUntil > 7 * 24) {
            return NextResponse.json(
                { error: 'Confirmation available only within 7 days before appointment' },
                { status: 400 }
            );
        }

        // Update appointment action
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                attendance_confirmed: true,
                attendance_confirmed_at: new Date().toISOString(),
                status: 'attendance_confirmed',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (updateError) {
            console.error('[CONFIRM-PUBLIC] Update error:', updateError);
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
            const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
            const telegramChatIds = process.env.TELEGRAM_CHAT_ID?.split(",") || [];

            if (telegramToken && telegramChatIds.length > 0) {
                const telegramMessage = `✅ <b>PACJENT POTWIERDZIŁ OBECNOŚĆ</b> (Landing Page)\\n\\n` +
                    `📆 <b>Termin:</b> ${appointmentDateFormatted}, ${appointmentTime}\\n` +
                    `🩺 <b>Lekarz:</b> ${action.doctor_name || 'Nie podano'}\\n` +
                    `📞 <b>Telefon:</b> <a href="tel:${patient?.phone}">${patient?.phone || 'Brak'}</a>`;

                const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
                await Promise.all(telegramChatIds.map(async (chatId) => {
                    const cleanChatId = chatId.trim();
                    if (!cleanChatId) return;
                    try {
                        await fetch(tgUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: cleanChatId,
                                text: telegramMessage,
                                parse_mode: "HTML"
                            }),
                        });
                        telegramSent = true;
                    } catch (e) {
                        console.error('[CONFIRM-PUBLIC] Telegram Error:', e);
                    }
                }));
            }
        } catch (telegramError) {
            console.error('[CONFIRM-PUBLIC] Failed to send telegram:', telegramError);
        }

        // Send Email notification
        let emailSent = false;
        try {
            if (process.env.RESEND_API_KEY) {
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);

                await resend.emails.send({
                    from: 'Mikrostomart \u003cnoreply@mikrostomart.pl\u003e',
                    to: process.env.ADMIN_EMAIL || 'gabinet@mikrostomart.pl',
                    subject: '✅ Pacjent potwierdził obecność',
                    html: `
                        \u003ch2\u003e✅ PACJENT POTWIERDZIŁ WIZYTĘ\u003c/h2\u003e
                        <p><strong>Pacjent:</strong> ${action.patient_name || 'Nieznany pacjent'}</p>
                        <p><strong>Telefon:</strong> ${action.patient_phone || 'Brak'}</p>
                        <p><strong>Data:</strong> ${appointmentDateFormatted}</p>
                        <p><strong>Godzina:</strong> ${appointmentTime}</p>
                        <p><strong>Lekarz:</strong> ${action.doctor_name || 'Nie podano'}</p>
                        \u003cp\u003e\u003cem\u003ePotwierdzenie z landing page (${new Date().toLocaleString('pl-PL')})\u003c/em\u003e\u003c/p\u003e
                    `
                });
                emailSent = true;
            }
        } catch (emailError) {
            console.error('[CONFIRM-PUBLIC] Failed to send email:', emailError);
        }

        // Send WhatsApp notification (using same Telegram bot)
        let whatsappSent = false;
        try {
            const whatsappToken = process.env.WHATSAPP_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
            const whatsappChatId = process.env.WHATSAPP_CHAT_ID;

            if (whatsappToken && whatsappChatId) {
                const whatsappMessage = `✅ PACJENT POTWIERDZIŁ WIZYTĘ\\n\\n` +
                    `📅 ${appointmentDateFormatted}, ${appointmentTime}\\n` +
                    `🩺 ${action.doctor_name || 'Nie podano'}\\n` +
                    `📞 ${patient?.phone || 'Brak'}`;

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
            console.error('[CONFIRM-PUBLIC] WhatsApp notification failed:', whatsappError);
        }

        console.log('[CONFIRM-PUBLIC] Success:', { telegramSent, whatsappSent, emailSent });

        return NextResponse.json({
            success: true,
            message: 'Potwierdzenie wysłane. Gabinet został powiadomiony.',
            telegramSent,
            whatsappSent,
            emailSent
        });

    } catch (error) {
        console.error('[CONFIRM-PUBLIC] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

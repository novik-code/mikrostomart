import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifyToken } from '@/lib/jwt';
import type { ConfirmAttendanceRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;
        const body: ConfirmAttendanceRequest = await request.json();

        // Verify JWT
        const authHeader = request.headers.get('authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get patient record
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        // Get appointment action
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient.id)
            .single();

        if (actionError || !action) {
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        const appointmentAction = action as AppointmentAction;

        // Validate timing (must be <24h before appointment)
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntil > 24) {
            return NextResponse.json(
                { error: 'Potwierdzenie obecności możliwe tylko 24h przed wizytą' },
                { status: 400 }
            );
        }

        if (hoursUntil <= 0) {
            return NextResponse.json(
                { error: 'Wizyta już się odbyła' },
                { status: 400 }
            );
        }

        if (appointmentAction.attendance_confirmed) {
            return NextResponse.json(
                { error: 'Obecność już potwierdzona' },
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
            throw updateError;
        }

        // Format dates for email
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
        const confirmedAt = new Date().toLocaleString('pl-PL');

        // Send email to clinic
        const emailHtml = `
            <h2>✅ Pacjent potwierdził obecność na wizycie</h2>
            
            <p>Dzień dobry,</p>
            
            <p>Pacjent <strong>POTWIERDZIŁ obecność</strong> na wizycie:</p>
            
            <ul>
                <li><strong>📅 Data:</strong> ${appointmentDateFormatted}</li>
                <li><strong>🕐 Godzina:</strong> ${appointmentTime}</li>
                <li><strong>👤 Pacjent:</strong> ${patient.phone}</li>
                <li><strong>👨‍⚕️ Lekarz:</strong> ${appointmentAction.doctor_name || 'Nie podano'}</li>
                <li><strong>📱 Telefon:</strong> ${patient.phone}</li>
            </ul>
            
            <hr>
            
            <p><strong>Status:</strong> Obecność potwierdzona<br>
            <strong>Potwierdzono:</strong> ${confirmedAt}</p>
            
            <hr>
            <p style="color: #666; font-size: 12px;">
                Wiadomość wysłana automatycznie z systemu Strefa Pacjenta<br>
                Mikrostomart - Dentysta Opole
            </p>
        `;

        let emailSent = false;
        try {
            await resend.emails.send({
                from: 'Strefa Pacjenta <noreply@mikrostomart.pl>',
                to: ['gabinet@mikrostomart.pl'],
                subject: '✅ Pacjent potwierdził obecność na wizycie',
                html: emailHtml
            });
            emailSent = true;
        } catch (emailError) {
            console.error('[CONFIRM-ATTENDANCE] Failed to send email:', emailError);
            console.error('[CONFIRM-ATTENDANCE] Email error details:', {
                message: emailError instanceof Error ? emailError.message : 'Unknown error',
                stack: emailError instanceof Error ? emailError.stack : undefined,
                fullError: JSON.stringify(emailError, Object.getOwnPropertyNames(emailError))
            });
        }

        // Send Telegram notification
        let telegramSent = false;
        try {
            const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
            const telegramChatIds = process.env.TELEGRAM_CHAT_ID?.split(",") || [];

            if (telegramToken && telegramChatIds.length > 0) {
                const telegramMessage = `✅ <b>PACJENT POTWIERDZIŁ OBECNOŚĆ</b>\n\n` +
                    `📆 <b>Termin:</b> ${appointmentDateFormatted}, ${appointmentTime}\n` +
                    `🩺 <b>Lekarz:</b> ${appointmentAction.doctor_name || 'Nie podano'}\n` +
                    `📞 <b>Telefon pacjenta:</b> <a href="tel:${patient.phone}">${patient.phone}</a>`;

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
                        console.error('[CONFIRM-ATTENDANCE] Telegram Error:', e);
                    }
                }));
            }
        } catch (telegramError) {
            console.error('[CONFIRM-ATTENDANCE] Failed to send telegram:', telegramError);
        }

        const response: AppointmentActionResponse = {
            success: true,
            message: 'Potwierdzenie obecności wysłane. Gabinet został powiadomiony.',
            emailSent,
            telegramSent
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error confirming attendance:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

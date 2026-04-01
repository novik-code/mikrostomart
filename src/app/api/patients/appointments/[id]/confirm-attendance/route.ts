import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';
import type { ConfirmAttendanceRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;
        const body: ConfirmAttendanceRequest = await request.json();

        // Verify JWT
        
        const payload = verifyTokenFromRequest(request);

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
            await sendEmail({
                to: demoSanitize('gabinet@mikrostomart.pl'),
                subject: '✅ Pacjent potwierdził obecność na wizycie',
                html: emailHtml,
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
            const telegramMessage = `✅ <b>PACJENT POTWIERDZIŁ OBECNOŚĆ</b>\n\n` +
                `📆 <b>Termin:</b> ${appointmentDateFormatted}, ${appointmentTime}\n` +
                `🩺 <b>Lekarz:</b> ${appointmentAction.doctor_name || 'Nie podano'}\n` +
                `📞 <b>Telefon pacjenta:</b> <a href="tel:${patient.phone}">${patient.phone}</a>`;

            telegramSent = await sendTelegramNotification(telegramMessage, 'appointments');
        } catch (telegramError) {
            console.error('[CONFIRM-ATTENDANCE] Failed to send telegram:', telegramError);
        }

        // Push notification to admins and employees
        const pushParams = {
            patient: patient.phone || 'Pacjent',
            date: appointmentDateFormatted,
            time: appointmentTime,
            doctor: appointmentAction.doctor_name || '',
        };
        broadcastPush('admin', 'appointment_confirmed', pushParams, '/admin').catch(console.error);
        broadcastPush('employee', 'appointment_confirmed', pushParams, '/pracownik').catch(console.error);

        // Add "Pacjent potwierdzony" icon in Prodentis (icon ID 0000000010)
        let iconAdded = false;
        try {
            const PRODENTIS_API = process.env.PRODENTIS_API_URL || process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
            const PRODENTIS_KEY = process.env.PRODENTIS_API_KEY || '';
            const prodentisAptId = appointmentAction.prodentis_id;

            if (prodentisAptId && PRODENTIS_KEY) {
                const iconRes = await fetch(`${PRODENTIS_API}/api/schedule/appointment/${prodentisAptId}/icon`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': PRODENTIS_KEY,
                    },
                    body: JSON.stringify({ iconId: '0000000010' }),
                    signal: AbortSignal.timeout(10000),
                });
                iconAdded = iconRes.ok;
                console.log(`[CONFIRM-ATTENDANCE] Prodentis icon ${iconAdded ? 'added' : 'failed'}:`, prodentisAptId);
            } else {
                console.warn('[CONFIRM-ATTENDANCE] No prodentis_id or API key — skipping icon');
            }
        } catch (iconError) {
            console.error('[CONFIRM-ATTENDANCE] Failed to add Prodentis icon:', iconError);
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

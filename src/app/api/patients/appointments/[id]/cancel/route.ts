import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifyToken } from '@/lib/jwt';
import { sendTelegramNotification } from '@/lib/telegram';
import type { CancelAppointmentRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';

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
        const body: CancelAppointmentRequest = await request.json();

        // Verify JWT
        const authHeader = request.headers.get('authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get patient
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Get appointment action
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient.id)
            .single();

        if (actionError || !action) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        const appointmentAction = action as AppointmentAction;

        // Validate appointment hasn't passed
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();

        if (appointmentDate <= now) {
            return NextResponse.json(
                { error: 'Nie można odwołać wizyty która już się odbyła' },
                { status: 400 }
            );
        }

        if (appointmentAction.cancellation_requested) {
            return NextResponse.json(
                { error: 'Prośba o odwołanie już została wysłana' },
                { status: 400 }
            );
        }

        // Update appointment action
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                cancellation_requested: true,
                cancellation_requested_at: new Date().toISOString(),
                cancellation_reason: body.reason || null,
                status: 'cancellation_pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        // Format dates
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

        // Send email to clinic
        const emailHtml = `
            <h2>⚠️ Pacjent prosi o odwołanie wizyty</h2>
            
            <p>Dzień dobry,</p>
            
            <p>Pacjent <strong>PROSI O ODWOŁANIE</strong> wizyty:</p>
            
            <ul>
                <li><strong>📅 Data:</strong> ${appointmentDateFormatted}</li>
                <li><strong>🕐 Godzina:</strong> ${appointmentTime}</li>
                <li><strong>👤 Pacjent:</strong> ${patient.phone}</li>
                <li><strong>👨‍⚕️ Lekarz:</strong> ${appointmentAction.doctor_name || 'Nie podano'}</li>
                <li><strong>📱 Telefon:</strong> ${patient.phone}</li>
            </ul>
            
            ${body.reason ? `
            <p><strong>Powód:</strong><br>
            ${body.reason}</p>
            ` : '<p><strong>Powód:</strong> Nie podano</p>'}
            
            <hr>
            
            <p>⚠️ <strong>Wymagane działanie:</strong><br>
            Prośba wymaga <strong>ręcznego odwołania</strong> wizyty w systemie Prodentis.</p>
            
            <p>Pacjent został poinformowany, że wizyta zostanie odwołana w ciągu 24h.</p>
            
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
                subject: '⚠️ Pacjent prosi o odwołanie wizyty',
                html: emailHtml
            });
            emailSent = true;
        } catch (emailError) {
            console.error('[CANCEL] Failed to send email:', emailError);
            console.error('[CANCEL] Email error details:', {
                message: emailError instanceof Error ? emailError.message : 'Unknown error',
                stack: emailError instanceof Error ? emailError.stack : undefined,
                fullError: JSON.stringify(emailError, Object.getOwnPropertyNames(emailError))
            });
        }

        // Send Telegram notification
        let telegramSent = false;
        try {
            const telegramMessage = `⚠️ <b>PROŚBA O ODWOŁANIE WIZYTY</b>\n\n` +
                `📆 <b>Termin:</b> ${appointmentDateFormatted}, ${appointmentTime}\n` +
                `🩺 <b>Lekarz:</b> ${appointmentAction.doctor_name || 'Nie podano'}\n` +
                `📞 <b>Telefon pacjenta:</b> <a href="tel:${patient.phone}">${patient.phone}</a>\n\n` +
                `💬 <b>Powód:</b> ${body.reason || 'Nie podano'}`;

            telegramSent = await sendTelegramNotification(telegramMessage, 'appointments');
        } catch (telegramError) {
            console.error('[CANCEL] Failed to send telegram:', telegramError);
        }

        const response: AppointmentActionResponse = {
            success: true,
            message: 'Prośba o odwołanie wizyty została wysłana. Gabinet skontaktuje się w ciągu 24h.',
            emailSent
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error canceling appointment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

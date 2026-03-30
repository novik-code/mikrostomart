import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';
import { sendSMS } from '@/lib/smsService';
import type { CancelAppointmentRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
const PRODENTIS_KEY = process.env.PRODENTIS_API_KEY || '';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;
        const body: CancelAppointmentRequest = await request.json();

        // Verify JWT
        
        const payload = verifyTokenFromRequest(request);

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

        // ── Block if attendance confirmed ──
        if (appointmentAction.attendance_confirmed) {
            return NextResponse.json(
                { error: 'Nie można odwołać wizyty po potwierdzeniu obecności' },
                { status: 400 }
            );
        }

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
                { error: 'Wizyta została już odwołana' },
                { status: 400 }
            );
        }

        // ── DELETE appointment from Prodentis ──
        let prodentisDeleted = false;
        const prodentisAptId = appointmentAction.prodentis_id;

        if (prodentisAptId && PRODENTIS_KEY) {
            try {
                const deleteRes = await fetch(`${PRODENTIS_API}/api/schedule/appointment/${prodentisAptId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': PRODENTIS_KEY,
                    },
                    body: JSON.stringify({ reason: body.reason || 'Odwołane przez pacjenta z portalu' }),
                    signal: AbortSignal.timeout(15000),
                });

                if (deleteRes.ok) {
                    prodentisDeleted = true;
                    console.log(`[CANCEL] Prodentis DELETE success: ${prodentisAptId}`);
                } else {
                    const errData = await deleteRes.json().catch(() => ({}));
                    console.error(`[CANCEL] Prodentis DELETE failed (${deleteRes.status}):`, errData);
                    // If 404, appointment may already be deleted — treat as success
                    if (deleteRes.status === 404) {
                        prodentisDeleted = true;
                        console.log('[CANCEL] Appointment already deleted in Prodentis');
                    }
                }
            } catch (prodErr) {
                console.error('[CANCEL] Prodentis DELETE error:', prodErr);
            }
        } else {
            console.warn('[CANCEL] No prodentis_id or API key — skipping DELETE');
        }

        // ── Update appointment action ──
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                cancellation_requested: true,
                cancellation_requested_at: new Date().toISOString(),
                cancellation_reason: body.reason || null,
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        // ── Save to cancelled_appointments table ──
        // Get patient name from Prodentis
        let patientName = '';
        try {
            const detRes = await fetch(`${PRODENTIS_API}/api/patient/${patient.prodentis_id}/details`, {
                signal: AbortSignal.timeout(5000),
            });
            if (detRes.ok) {
                const det = await detRes.json();
                patientName = `${det.firstName || ''} ${det.lastName || ''}`.trim();
            }
        } catch (e) {
            console.warn('[CANCEL] Failed to fetch patient name:', e);
        }

        await supabase.from('cancelled_appointments').insert({
            prodentis_appointment_id: prodentisAptId,
            patient_name: patientName || patient.phone,
            patient_phone: patient.phone,
            patient_prodentis_id: patient.prodentis_id,
            appointment_date: appointmentAction.appointment_date,
            doctor_name: appointmentAction.doctor_name,
            reason: body.reason || null,
            cancelled_by: 'patient',
        });

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

        // ── Send email to clinic ──
        let emailSent = false;
        try {
            const emailHtml = `
                <h2>❌ Wizyta odwołana przez pacjenta</h2>
                <p>Pacjent <strong>ODWOŁAŁ</strong> wizytę (automatycznie usunięta z Prodentis):</p>
                <ul>
                    <li><strong>📅 Data:</strong> ${appointmentDateFormatted}</li>
                    <li><strong>🕐 Godzina:</strong> ${appointmentTime}</li>
                    <li><strong>👤 Pacjent:</strong> ${patientName || patient.phone}</li>
                    <li><strong>👨‍⚕️ Lekarz:</strong> ${appointmentAction.doctor_name || 'Nie podano'}</li>
                    <li><strong>📱 Telefon:</strong> ${patient.phone}</li>
                </ul>
                ${body.reason ? `<p><strong>Powód:</strong><br>${body.reason}</p>` : '<p><strong>Powód:</strong> Nie podano</p>'}
                <hr>
                <p>✅ Wizyta została <strong>automatycznie usunięta</strong> z grafiku Prodentis.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Wiadomość wysłana automatycznie z systemu Strefa Pacjenta<br>
                    Mikrostomart - Dentysta Opole
                </p>
            `;

            await sendEmail({
                to: demoSanitize('gabinet@mikrostomart.pl'),
                subject: '❌ Wizyta odwołana przez pacjenta',
                html: emailHtml,
            });
            emailSent = true;
        } catch (emailError) {
            console.error('[CANCEL] Failed to send email:', emailError);
        }

        // ── Send Telegram notification ──
        let telegramSent = false;
        try {
            const telegramMessage = `❌ <b>WIZYTA ODWOŁANA PRZEZ PACJENTA</b>\n\n` +
                `📆 <b>Termin:</b> ${appointmentDateFormatted}, ${appointmentTime}\n` +
                `🩺 <b>Lekarz:</b> ${appointmentAction.doctor_name || 'Nie podano'}\n` +
                `👤 <b>Pacjent:</b> ${patientName || 'Nieznany'}\n` +
                `📞 <b>Telefon:</b> <a href="tel:${patient.phone}">${patient.phone}</a>\n\n` +
                `💬 <b>Powód:</b> ${body.reason || 'Nie podano'}\n\n` +
                `✅ Usunięto z grafiku Prodentis: ${prodentisDeleted ? 'TAK' : 'NIE (ręcznie!)'}`;

            telegramSent = await sendTelegramNotification(telegramMessage, 'appointments');
        } catch (telegramError) {
            console.error('[CANCEL] Failed to send telegram:', telegramError);
        }

        // ── Push notification to admins and employees ──
        const pushParams = {
            patient: patientName || patient.phone || 'Pacjent',
            date: appointmentDateFormatted,
            time: appointmentTime,
            doctor: appointmentAction.doctor_name || '',
            reason: body.reason || 'Nie podano',
        };
        broadcastPush('admin', 'appointment_cancelled', pushParams, '/admin').catch(console.error);
        broadcastPush('employee', 'appointment_cancelled', pushParams, '/pracownik').catch(console.error);

        // ── SMS confirmation to patient ──
        if (patient.phone) {
            try {
                await sendSMS({
                    to: patient.phone,
                    message: `Twoja wizyta ${appointmentDateFormatted} o godz. ${appointmentTime} została odwołana. Aby umówić nowy termin odwiedź strefę pacjenta lub zadzwoń: 77 454 24 24. Mikrostomart`,
                });
            } catch (smsErr) {
                console.error('[CANCEL] SMS to patient failed:', smsErr);
            }
        }

        const response: AppointmentActionResponse = {
            success: true,
            message: 'Wizyta została odwołana i usunięta z grafiku.',
            emailSent,
            telegramSent,
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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';
import { sendSMS } from '@/lib/smsService';
import type { RescheduleAppointmentRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
const PRODENTIS_KEY = process.env.PRODENTIS_API_KEY || '';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;
        const body: RescheduleAppointmentRequest = await request.json();

        // Verify JWT
        
        const payload = verifyTokenFromRequest(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate required fields
        if (!body.newDate || !body.newStartTime) {
            return NextResponse.json(
                { error: 'Wymagane pola: newDate i newStartTime' },
                { status: 400 }
            );
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
                { error: 'Nie można przełożyć wizyty po potwierdzeniu obecności' },
                { status: 400 }
            );
        }

        // Validate appointment hasn't passed
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();

        if (appointmentDate <= now) {
            return NextResponse.json(
                { error: 'Nie można przełożyć wizyty która już się odbyła' },
                { status: 400 }
            );
        }

        if (appointmentAction.reschedule_requested) {
            return NextResponse.json(
                { error: 'Wizyta została już przełożona' },
                { status: 400 }
            );
        }

        // ── PUT reschedule in Prodentis ──
        let prodentisRescheduled = false;
        let newEndTime = '';
        const prodentisAptId = appointmentAction.prodentis_id;

        if (prodentisAptId && PRODENTIS_KEY) {
            try {
                const rescheduleRes = await fetch(`${PRODENTIS_API}/api/schedule/appointment/${prodentisAptId}/reschedule`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': PRODENTIS_KEY,
                    },
                    body: JSON.stringify({
                        newDate: body.newDate,
                        newStartTime: body.newStartTime,
                        reason: body.reason || 'Przełożone przez pacjenta z portalu',
                    }),
                    signal: AbortSignal.timeout(15000),
                });

                if (rescheduleRes.ok) {
                    const rescheduleData = await rescheduleRes.json();
                    prodentisRescheduled = true;
                    newEndTime = rescheduleData.newEndTime || '';
                    console.log(`[RESCHEDULE] Prodentis success: ${prodentisAptId} → ${body.newDate} ${body.newStartTime}`);
                } else {
                    const errData = await rescheduleRes.json().catch(() => ({}));
                    console.error(`[RESCHEDULE] Prodentis failed (${rescheduleRes.status}):`, errData);

                    if (rescheduleRes.status === 409) {
                        return NextResponse.json(
                            { error: 'Wybrany termin jest już zajęty. Wybierz inny termin.' },
                            { status: 409 }
                        );
                    }
                    if (rescheduleRes.status === 404) {
                        return NextResponse.json(
                            { error: 'Wizyta nie została znaleziona w systemie Prodentis.' },
                            { status: 404 }
                        );
                    }

                    return NextResponse.json(
                        { error: 'Nie udało się przełożyć wizyty w systemie. Spróbuj ponownie.' },
                        { status: 500 }
                    );
                }
            } catch (prodErr) {
                console.error('[RESCHEDULE] Prodentis error:', prodErr);
                return NextResponse.json(
                    { error: 'Błąd połączenia z systemem rezerwacji. Spróbuj ponownie.' },
                    { status: 500 }
                );
            }
        } else {
            console.warn('[RESCHEDULE] No prodentis_id or API key');
            return NextResponse.json(
                { error: 'Brak konfiguracji API Prodentis' },
                { status: 500 }
            );
        }

        // ── Build new appointment date ──
        const newAppointmentDate = new Date(`${body.newDate}T${body.newStartTime}:00`);
        const newAppointmentEndDate = newEndTime
            ? new Date(`${body.newDate}T${newEndTime}:00`)
            : new Date(newAppointmentDate.getTime() + 30 * 60000); // default 30 min

        // ── Update appointment action ──
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                reschedule_requested: true,
                reschedule_requested_at: new Date().toISOString(),
                reschedule_reason: body.reason || null,
                appointment_date: newAppointmentDate.toISOString(),
                appointment_end_date: newAppointmentEndDate.toISOString(),
                status: 'rescheduled',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        // Format old dates
        const oldDateFormatted = appointmentDate.toLocaleDateString('pl-PL', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const oldTimeFormatted = appointmentDate.toLocaleTimeString('pl-PL', {
            hour: '2-digit', minute: '2-digit'
        });

        // Format new dates
        const newDateFormatted = newAppointmentDate.toLocaleDateString('pl-PL', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const newTimeFormatted = body.newStartTime;

        // ── Get patient name ──
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
            console.warn('[RESCHEDULE] Failed to fetch patient name:', e);
        }

        // ── Send email ──
        let emailSent = false;
        try {
            const emailHtml = `
                <h2>📅 Wizyta przełożona przez pacjenta</h2>
                <p>Pacjent <strong>PRZEŁOŻYŁ</strong> wizytę (automatycznie zaktualizowana w Prodentis):</p>
                <ul>
                    <li><strong>📅 Stary termin:</strong> ${oldDateFormatted}, ${oldTimeFormatted}</li>
                    <li><strong>📅 Nowy termin:</strong> ${newDateFormatted}, ${newTimeFormatted}</li>
                    <li><strong>👤 Pacjent:</strong> ${patientName || patient.phone}</li>
                    <li><strong>👨‍⚕️ Lekarz:</strong> ${appointmentAction.doctor_name || 'Nie podano'}</li>
                    <li><strong>📱 Telefon:</strong> ${patient.phone}</li>
                </ul>
                ${body.reason ? `<p><strong>Powód:</strong><br>${body.reason}</p>` : ''}
                <hr>
                <p>✅ Termin został <strong>automatycznie zaktualizowany</strong> w grafiku Prodentis.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Wiadomość wysłana automatycznie z systemu Strefa Pacjenta<br>
                    Mikrostomart - Dentysta Opole
                </p>
            `;

            await sendEmail({
                to: demoSanitize('gabinet@mikrostomart.pl'),
                subject: '📅 Wizyta przełożona przez pacjenta',
                html: emailHtml,
            });
            emailSent = true;
        } catch (emailError) {
            console.error('[RESCHEDULE] Failed to send email:', emailError);
        }

        // ── Telegram ──
        try {
            const telegramMessage = `📅 <b>WIZYTA PRZEŁOŻONA PRZEZ PACJENTA</b>\n\n` +
                `📆 <b>Stary termin:</b> ${oldDateFormatted}, ${oldTimeFormatted}\n` +
                `📆 <b>Nowy termin:</b> ${newDateFormatted}, ${newTimeFormatted}\n` +
                `🩺 <b>Lekarz:</b> ${appointmentAction.doctor_name || 'Nie podano'}\n` +
                `👤 <b>Pacjent:</b> ${patientName || patient.phone}\n` +
                `📞 <b>Telefon:</b> <a href="tel:${patient.phone}">${patient.phone}</a>\n\n` +
                `💬 <b>Powód:</b> ${body.reason || 'Nie podano'}\n\n` +
                `✅ Zaktualizowano w grafiku Prodentis`;

            await sendTelegramNotification(telegramMessage, 'appointments');
        } catch (telegramError) {
            console.error('[RESCHEDULE] Failed to send telegram:', telegramError);
        }

        // ── Push notifications ──
        const pushParams = {
            patient: patientName || patient.phone || 'Pacjent',
            date: newDateFormatted,
            time: newTimeFormatted,
            doctor: appointmentAction.doctor_name || '',
            reason: body.reason || 'Nie podano',
        };
        broadcastPush('admin', 'appointment_rescheduled', pushParams, '/admin').catch(console.error);
        broadcastPush('employee', 'appointment_rescheduled', pushParams, '/pracownik').catch(console.error);

        // ── SMS to patient ──
        if (patient.phone) {
            try {
                await sendSMS({
                    to: patient.phone,
                    message: `Twoja wizyta została przełożona na ${newDateFormatted} o godz. ${newTimeFormatted}. Szczegóły w strefie pacjenta. Mikrostomart`,
                });
            } catch (smsErr) {
                console.error('[RESCHEDULE] SMS to patient failed:', smsErr);
            }
        }

        const response: AppointmentActionResponse = {
            success: true,
            message: `Wizyta została przełożona na ${newDateFormatted} o godz. ${newTimeFormatted}.`,
            emailSent,
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

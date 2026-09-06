import { NextRequest, NextResponse } from 'next/server';
import { odswiezWizyte, rozjazdWizyty, czyWolnoRuszycWizyte } from '@/lib/prodentisAppointment';
import { powodPortalu } from '@/lib/portalReason';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import { guardAppointmentAction } from '@/lib/appointmentActionThrottle';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { sendSMS } from '@/lib/smsService';
import type { RescheduleAppointmentRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { getProdentisKey } from '@/lib/pmsConfig';
import { prodentisFetch } from '@/lib/prodentisFetch';
import { rescheduleCareflowForAppointment } from '@/lib/careflowLifecycle';
import { warsawIso } from '@/lib/careflowSchedule';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Dane pacjenta — nic nie może osiąść w cache CDN ani przeglądarki. */
const NO_STORE: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;
        const body: RescheduleAppointmentRequest = await request.json();

        // Verify JWT
        
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        }

        /**
         * 🔒 DŁAWIK (P-087) — po uwierzytelnieniu, przed bazą i przed PMS-em.
         * Wspólny kubełek dla odwołania, przełożenia i potwierdzenia obecności:
         * każda z nich budzi recepcję e-mailem, Telegramem i dwoma pushami.
         */
        const zaDuzoAkcji = await guardAppointmentAction(payload.prodentisId);
        if (zaDuzoAkcji) return zaDuzoAkcji;

        // Validate required fields
        if (!body.newDate || !body.newStartTime) {
            return NextResponse.json(
                { error: 'Wymagane pola: newDate i newStartTime' },
                { status: 400, headers: NO_STORE }
            );
        }

        // Get patient
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404, headers: NO_STORE });
        }

        // Get appointment action
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient.id)
            .single();

        if (actionError || !action) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404, headers: NO_STORE });
        }

        const appointmentAction = action as AppointmentAction;

        // ── Block if attendance confirmed ──
        if (appointmentAction.attendance_confirmed) {
            return NextResponse.json(
                { error: 'Nie można przełożyć wizyty po potwierdzeniu obecności' },
                { status: 400, headers: NO_STORE }
            );
        }

        // Validate appointment hasn't passed
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();

        if (appointmentDate <= now) {
            return NextResponse.json(
                { error: 'Nie można przełożyć wizyty która już się odbyła' },
                { status: 400, headers: NO_STORE }
            );
        }

        if (appointmentAction.reschedule_requested) {
            return NextResponse.json(
                { error: 'Wizyta została już przełożona' },
                { status: 400, headers: NO_STORE }
            );
        }

        // ── PUT reschedule in Prodentis ──
        let prodentisRescheduled = false;
        let newEndTime = '';
        const prodentisAptId = appointmentAction.prodentis_id;
        const PRODENTIS_KEY = (await getProdentisKey()) ?? '';

        // 🔑 3h — patrz `lib/prodentisAppointment.ts`. Tu jest to najważniejsze z trzech ścieżek:
        // przełożenie wizyty, której identyfikator jest nieaktualny, kończyło się dotąd surowym
        // „Nie udało się przełożyć wizyty. Spróbuj ponownie." — czyli ślepą uliczką w pętli.
        const stanWizyty = await odswiezWizyte(prodentisAptId);
        if (!stanWizyty.ok && stanWizyty.powod === 'not_found') {
            console.warn(`[RESCHEDULE] prodentis_id ${prodentisAptId} nieaktualny`);
            return NextResponse.json(
                { error: 'Ta wizyta została w międzyczasie zmieniona w systemie gabinetu. Zadzwoń do rejestracji — ustalimy nowy termin od ręki.' },
                { status: 409, headers: NO_STORE }
            );
        }
        if (!stanWizyty.ok && stanWizyty.powod === 'cancelled') {
            return NextResponse.json(
                { error: 'Ta wizyta została już odwołana. Umów nową wizytę albo zadzwoń do rejestracji.' },
                { status: 409, headers: NO_STORE }
            );
        }

        /**
         * 🔴 BRAMKA WŁASNOŚCI (P-001). Do 05.09 sprawdzaliśmy własność WYŁĄCZNIE wobec
         * naszego wiersza w `appointment_actions` — a ten wiersz powstawał z identyfikatora
         * przysłanego przez klienta. Kto znał numer cudzej wizyty, mógł ją tu skreślić
         * KLUCZEM GABINETOWYM. `odswiezWizyte` powyżej i tak już pobrało stan wizyty razem
         * z `patientId`; brakowało jednego porównania.
         * 🪤 Brak pola `patientId` = fail-open (patrz `wizytaNalezyDoPacjenta`).
         */
        /**
         * 🔴 BRAMKA WŁASNOŚCI (P-001). Do 05.09 sprawdzaliśmy własność WYŁĄCZNIE wobec
         * naszego wiersza w `appointment_actions` — a ten wiersz powstawał z identyfikatora
         * przysłanego przez klienta. Kto znał numer cudzej wizyty, mógł ją tu skreślić
         * KLUCZEM GABINETOWYM.
         * 🪤 Rozstrzygnięcie żyje w `czyWolnoRuszycWizyte`, bo pierwsza wersja tej bramki
         * miała kształt `stanWizyty.ok && !nalezy(...)` i przy awarii CZĄSTKOWEJ PMS-u
         * (odczyt pada, zapisy żyją) pomijała sprawdzenie własności. Zmierzone wykonaniem.
         */
        if (prodentisAptId) {
            const werdykt = await czyWolnoRuszycWizyte({
                stanWizyty,
                prodentisAptId,
                prodentisId: payload.prodentisId,
            });
            if (!werdykt.wolno) {
                console.error(
                    `[OBCA-WIZYTA] RESCHEDULE: pacjent ${payload.prodentisId}, wizyta ${prodentisAptId},`
                    + ` powód: ${werdykt.powod} — ODMOWA (${werdykt.status})`,
                );
                return NextResponse.json(
                    werdykt.status === 503
                        ? { error: 'Nie możemy teraz potwierdzić Twoich wizyt. Zadzwoń do rejestracji.' }
                        : { error: 'Appointment not found' },
                    { status: werdykt.status, headers: NO_STORE },
                );
            }
        }

        if (stanWizyty.ok) {
            const roznice = rozjazdWizyty(stanWizyty.wizyta, {
                date: appointmentAction.appointment_date?.slice(0, 10),
            });
            // 🪤 Realny przypadek: u nas 11.09 14:30, w Prodentisie 16:30. Bez tego logu
            // rozjazd byłby niewidoczny aż do skargi pacjenta.
            if (roznice.length) console.warn(`[RESCHEDULE] Rozjazd stanu wizyty ${prodentisAptId}: ${roznice.join(' · ')}`);
        }

        if (prodentisAptId && PRODENTIS_KEY) {
            try {
                const rescheduleRes = await prodentisFetch(`/api/schedule/appointment/${prodentisAptId}/reschedule`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        newDate: body.newDate,
                        newStartTime: body.newStartTime,
                        reason: powodPortalu('reschedule', body.reason),
                    }),
                    timeoutMs: 15000,
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
                            { status: 409, headers: NO_STORE }
                        );
                    }
                    if (rescheduleRes.status === 404) {
                        return NextResponse.json(
                            { error: 'Wizyta nie została znaleziona w systemie Prodentis.' },
                            { status: 404, headers: NO_STORE }
                        );
                    }

                    return NextResponse.json(
                        { error: 'Nie udało się przełożyć wizyty w systemie. Spróbuj ponownie.' },
                        { status: 500, headers: NO_STORE }
                    );
                }
            } catch (prodErr) {
                console.error('[RESCHEDULE] Prodentis error:', prodErr);
                return NextResponse.json(
                    { error: 'Błąd połączenia z systemem rezerwacji. Spróbuj ponownie.' },
                    { status: 500, headers: NO_STORE }
                );
            }
        } else {
            console.warn('[RESCHEDULE] No prodentis_id or API key');
            return NextResponse.json(
                { error: 'Brak konfiguracji API Prodentis' },
                { status: 500, headers: NO_STORE }
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

        // ── Przelicz CareFlow na nowy termin ──
        // Punkt zerowy offsetów to moment zabiegu, więc bez tego cały protokół
        // (leki, kontrola) zostaje przy starej dacie. Datę składamy z jawnym offsetem
        // Warszawy — Prodentis podaje czas lokalny, a serwer chodzi w UTC.
        // Awaited, bo praca po zwróceniu odpowiedzi nie jest na Vercelu gwarantowana;
        // helper sam łapie wszystkie błędy, więc nie wywróci przełożenia wizyty.
        const careflow = await rescheduleCareflowForAppointment({
            appointmentId: prodentisAptId || undefined,
            prodentisId: patient.prodentis_id || undefined,
            oldDate: appointmentAction.appointment_date,
            newDate: warsawIso(body.newDate, body.newStartTime),
            actor: 'patient',
        });

        // Niejednoznaczne dopasowanie = ŻADEN protokół nie został przesunięty, więc leki i kontrola
        // zostają przy STARYM terminie. Alarm dla personelu (Telegram + push) wysyła sam helper —
        // jedno źródło, żeby nie dublować go z trzech tras. Tu dokładamy tylko powiązanie z wizytą
        // w portalu, którego helper nie zna (ma ID Prodentisa).
        if (careflow.ambiguousEnrollmentIds.length > 0) {
            console.warn(
                `[RESCHEDULE] CareFlow wymaga ręcznej decyzji — wizyta portalu ${appointmentId}, ` +
                `zapisy: ${careflow.ambiguousEnrollmentIds.join(', ')}`
            );
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
            const detRes = await prodentisFetch(`/api/patient/${patient.prodentis_id}/details`);
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
        broadcastPush('admin', 'appointment_rescheduled', pushParams, '/admin', { alsoApp: true }).catch(console.error);
        broadcastPush('employee', 'appointment_rescheduled', pushParams, '/pracownik', { alsoApp: true }).catch(console.error);

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

        return NextResponse.json(response, { headers: NO_STORE });

    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: NO_STORE }
        );
    }
}

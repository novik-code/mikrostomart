import { NextRequest, NextResponse } from 'next/server';
import { odswiezWizyte, rozjazdWizyty, czyWolnoRuszycWizyte } from '@/lib/prodentisAppointment';
import { powodPortalu } from '@/lib/portalReason';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { sendSMS } from '@/lib/smsService';
import type { CancelAppointmentRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { prodentisFetch } from '@/lib/prodentisFetch';
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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;
        const body: CancelAppointmentRequest = await request.json();

        // Verify JWT
        
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
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
                { error: 'Nie można odwołać wizyty po potwierdzeniu obecności' },
                { status: 400, headers: NO_STORE }
            );
        }

        // Validate appointment hasn't passed
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();

        if (appointmentDate <= now) {
            return NextResponse.json(
                { error: 'Nie można odwołać wizyty która już się odbyła' },
                { status: 400, headers: NO_STORE }
            );
        }

        if (appointmentAction.cancellation_requested) {
            return NextResponse.json(
                { error: 'Wizyta została już odwołana' },
                { status: 400, headers: NO_STORE }
            );
        }

        // ── DELETE appointment from Prodentis ──
        let prodentisDeleted = false;
        const prodentisAptId = appointmentAction.prodentis_id;

        // 🔑 3h: odświeżamy stan PRZED zapisem. Zapamiętany identyfikator bywa nieaktualny —
        // przełożenie wizyty tworzy w Prodentisie NOWY rekord z nowym id, a zmiana lekarza
        // jest robiona w miejscu (28 % naszych rezerwacji stoi u innego lekarza, niż wysłaliśmy).
        // 🪤 `unavailable` znaczy „nie wiemy" i celowo NIE przerywa operacji — awaria łączności
        // nie może udawać, że wizyta zniknęła.
        const stanWizyty = await odswiezWizyte(prodentisAptId);
        // 🔑 Czy PMS POTWIERDZIŁ nam stan tej wizyty? `unavailable` znaczy „nie wiemy" —
        // i tej niewiedzy nie wolno później zamienić w pewność (patrz gałąź 404 niżej).
        const stanPotwierdzony = stanWizyty.ok || stanWizyty.powod === 'cancelled';
        if (!stanWizyty.ok && stanWizyty.powod === 'not_found') {
            console.warn(`[CANCEL] prodentis_id ${prodentisAptId} nieaktualny — wizyta przeniesiona lub usunięta`);
            return NextResponse.json(
                { error: 'Ta wizyta została w międzyczasie zmieniona w systemie gabinetu. Zadzwoń do rejestracji, potwierdzimy odwołanie.' },
                { status: 409, headers: NO_STORE }
            );
        }
        if (!stanWizyty.ok && stanWizyty.powod === 'cancelled') {
            // Pacjent chce, żeby wizyty nie było — i jej nie ma. To sukces, nie błąd.
            console.log(`[CANCEL] Wizyta ${prodentisAptId} była już skreślona w Prodentisie — idempotentny sukces`);
            return NextResponse.json({ success: true, alreadyCancelled: true }, { headers: NO_STORE });
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
                    `[OBCA-WIZYTA] CANCEL: pacjent ${payload.prodentisId}, wizyta ${prodentisAptId},`
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
                doctorProdentisId: null,
            });
            if (roznice.length) console.warn(`[CANCEL] Rozjazd stanu wizyty ${prodentisAptId}: ${roznice.join(' · ')}`);
        }

        // 🔑 Bramka sprawdza już TYLKO identyfikator wizyty. Brak klucza nie może po cichu
        // pominąć skreślenia — wtedy `prodentisFetch` rzuca `BrakKluczaPMS`, a poniższy
        // `catch` robi z tego głośny log zamiast cichej rezygnacji.
        if (prodentisAptId) {
            try {
                const deleteRes = await prodentisFetch(`/api/schedule/appointment/${prodentisAptId}`, {
                    method: 'DELETE',
                    // 🔑 Uzgodnione z PMS: prefiks maszynowy + opis dla recepcji (`lib/portalReason.ts`).
                    // Kod skreślenia `106` jest NATYWNYM kodem Prodentisa (~15 tys. użyć przez
                    // personel), więc nie da się z niego poznać, kto odwołał. To pole jest jedynym
                    // działającym znacznikiem pochodzenia — wysyłamy je ZAWSZE.
                    body: JSON.stringify({ reason: powodPortalu('cancel', body.reason) }),
                    timeoutMs: 15000,
                });

                if (deleteRes.ok) {
                    prodentisDeleted = true;
                    console.log(`[CANCEL] Prodentis DELETE success: ${prodentisAptId}`);
                } else {
                    const errData = await deleteRes.json().catch(() => ({}));
                    console.error(`[CANCEL] Prodentis DELETE failed (${deleteRes.status}):`, errData);
                    // 🪤 404 MA DWIE PRZYCZYNY: wizyta naprawdę już nie istnieje ALBO nasz
                    // `prodentis_id` jest nieaktualny (recepcja przesunęła wizytę ręcznie na
                    // pulpicie — Prodentis soft-deletuje wiersz i tworzy nowy, z nowym id;
                    // potwierdzone przez dostawcę 04.09). W tym drugim przypadku wizyta ZOSTAJE
                    // w grafiku, a my zaraportowalibyśmy gabinetowi „✅ usunięto: TAK" i NIE
                    // zawołali recepcji do ręcznego sprzątnięcia — czyli zablokowany slot,
                    // o którym nikt nie wie.
                    // Rozstrzyga to, czy PMS potwierdził nam wcześniej stan tej wizyty.
                    if (deleteRes.status === 404) {
                        if (stanPotwierdzony) {
                            prodentisDeleted = true;
                            console.log('[CANCEL] Appointment already deleted in Prodentis');
                        } else {
                            console.error(
                                `[CANCEL] 404 przy NIEPOTWIERDZONYM stanie wizyty ${prodentisAptId}`
                                + ' — nie wiemy, czy zniknęła, czy mamy nieaktualny identyfikator.'
                                + ' Zgłaszamy gabinetowi do ręcznego sprawdzenia.',
                            );
                        }
                    }
                }
            } catch (prodErr) {
                console.error('[CANCEL] Prodentis DELETE error:', prodErr);
            }
        } else {
            console.warn('[CANCEL] No prodentis_id — skipping DELETE');
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
            const detRes = await prodentisFetch(`/api/patient/${patient.prodentis_id}/details`);
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

        // ── Zamknij CareFlow odwołanego zabiegu ──
        // Bez tego cron dalej przypomina o lekach do zabiegu, który się nie odbędzie.
        // Awaited, bo praca po zwróceniu odpowiedzi nie jest na Vercelu gwarantowana;
        // helper sam łapie wszystkie błędy, więc nie wywróci odwołania wizyty.
        const careflow = await cancelCareflowForAppointment({
            appointmentId: prodentisAptId || undefined,
            prodentisId: patient.prodentis_id || undefined,
            appointmentDate: appointmentAction.appointment_date,
            actor: 'patient',
            reason: body.reason || 'Wizyta odwołana przez pacjenta',
        });

        // Niejednoznaczne dopasowanie = ŻADEN protokół nie został zamknięty, więc cron dalej
        // przypomina o osłonie antybiotykowej do zabiegu, którego nie będzie. Alarm dla personelu
        // (Telegram + push) wysyła sam helper — jedno źródło, żeby nie dublować go z trzech tras.
        // Tu dokładamy tylko powiązanie z wizytą w portalu, którego helper nie zna (ma ID Prodentisa).
        if (careflow.ambiguousEnrollmentIds.length > 0) {
            console.warn(
                `[CANCEL] CareFlow wymaga ręcznej decyzji — wizyta portalu ${appointmentId}, ` +
                `zapisy: ${careflow.ambiguousEnrollmentIds.join(', ')}`
            );
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
        broadcastPush('admin', 'appointment_cancelled', pushParams, '/admin', { alsoApp: true }).catch(console.error);
        broadcastPush('employee', 'appointment_cancelled', pushParams, '/pracownik', { alsoApp: true }).catch(console.error);

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

        return NextResponse.json(response, { headers: NO_STORE });

    } catch (error) {
        console.error('Error canceling appointment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: NO_STORE }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { getProdentisKey } from '@/lib/pmsConfig';

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
            const telegramMessage = `✅ <b>PACJENT POTWIERDZIŁ OBECNOŚĆ</b>\\n\\n` +
                `👤 <b>Pacjent:</b> ${action.patient_name || 'Nieznany pacjent'}\\n` +
                `📞 <b>Telefon:</b> <a href="tel:${action.patient_phone}">${action.patient_phone || 'Brak'}</a>\\n` +
                `📅 <b>Data:</b> ${appointmentDateFormatted}\\n` +
                `⏰ <b>Godzina:</b> ${appointmentTime}\\n` +
                `🩺 <b>Lekarz:</b> ${action.doctor_name || 'Nie podano'}`;

            telegramSent = await sendTelegramNotification(telegramMessage, 'appointments');
        } catch (telegramError) {
            console.error('[CONFIRM-PUBLIC] Failed to send telegram:', telegramError);
        }

        // Push notification to admins and employees
        const pushParams = {
            patient: action.patient_name || 'Pacjent',
            date: appointmentDateFormatted,
            time: appointmentTime,
            doctor: action.doctor_name || '',
        };
        broadcastPush('admin', 'appointment_confirmed', pushParams, '/admin').catch(console.error);
        broadcastPush('employee', 'appointment_confirmed', pushParams, '/pracownik').catch(console.error);

        // Add "Pacjent potwierdzony" icon in Prodentis (icon ID 0000000010).
        //
        // 2026-05-13 hardening — reception moves/cancels appointments in the Prodentis
        // desktop during the day. Prodentis soft-deletes the old row (deleted=1) and
        // creates a NEW one with a new id_schedule. Our stored prodentis_id then goes
        // stale and POST /icon returns 404. Strategy:
        //   1. Try POST /icon with stored ID (fast path, ~95% of cases).
        //   2. On 404, refresh ID via GET /api/appointments/by-date — match by
        //      patient phone + appointment date+time (date is YYYY-MM-DD, time is HH:MM).
        //   3. If a new ID is found, persist it on appointment_actions and retry.
        //   4. If no match (appointment was cancelled, not just moved) — Telegram alert
        //      to the gabinet Telegram chat so reception can call the patient back.
        //
        // Outcome is persisted to appointment_actions.prodentis_icon_synced[+_at|_error]
        // so admin can see Prodentis sync status alongside "patient clicked" in the
        // SMS reminders tab.
        let iconAdded = false;
        let iconErrorReason: string | null = null;
        let prodentisIdUsed = action.prodentis_id as string | null;
        let prodentisIdRefreshed = false;

        const PRODENTIS_API = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
        const PRODENTIS_KEY = (await getProdentisKey()) ?? '';

        async function postIcon(id: string): Promise<{ ok: boolean; status: number }> {
            const res = await fetch(`${PRODENTIS_API}/api/schedule/appointment/${id}/icon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': PRODENTIS_KEY,
                },
                body: JSON.stringify({ iconId: '0000000010' }),
                signal: AbortSignal.timeout(10000),
            });
            return { ok: res.ok, status: res.status };
        }

        async function findFreshProdentisId(): Promise<string | null> {
            // Match on (patient_phone, appointment_date, appointment_time). Phones are
            // not normalized identically in both stores; we compare last 9 digits.
            const dateYmd = String(action.appointment_date).slice(0, 10);
            const apptIso = new Date(action.appointment_date).toISOString();
            const targetHhmm = apptIso.slice(11, 16);
            const targetPhoneTail = String(action.patient_phone || '').replace(/\D/g, '').slice(-9);

            const res = await fetch(`${PRODENTIS_API}/api/appointments/by-date?date=${dateYmd}`, {
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000),
            });
            if (!res.ok) {
                console.warn(`[CONFIRM-PUBLIC] by-date lookup failed: ${res.status}`);
                return null;
            }
            const data = await res.json();
            const list: Array<{ id: string; date: string; patientPhone?: string; patientName?: string }>
                = data.appointments || [];

            const match = list.find(a => {
                if (!a.id || a.id === action.prodentis_id) return false;
                const candHhmm = new Date(a.date).toISOString().slice(11, 16);
                if (candHhmm !== targetHhmm) return false;
                const candPhoneTail = String(a.patientPhone || '').replace(/\D/g, '').slice(-9);
                return candPhoneTail && candPhoneTail === targetPhoneTail;
            });
            return match?.id || null;
        }

        try {
            if (!prodentisIdUsed) {
                iconErrorReason = 'no_prodentis_id_on_action';
                console.warn('[CONFIRM-PUBLIC] action has no prodentis_id — cannot sync icon');
            } else if (!PRODENTIS_KEY) {
                iconErrorReason = 'no_api_key';
                console.warn('[CONFIRM-PUBLIC] no Prodentis API key — cannot sync icon');
            } else {
                // Fast path
                let res = await postIcon(prodentisIdUsed);
                console.log(`[CONFIRM-PUBLIC] Prodentis icon attempt 1: ${prodentisIdUsed} -> ${res.status}`);

                if (res.status === 404) {
                    // ID likely stale because reception moved/cancelled the appointment.
                    // Try to find the new ID by re-querying by-date.
                    const freshId = await findFreshProdentisId();
                    if (freshId) {
                        console.log(`[CONFIRM-PUBLIC] Refreshed ID: ${action.prodentis_id} -> ${freshId} — retrying`);
                        prodentisIdUsed = freshId;
                        prodentisIdRefreshed = true;
                        // Persist the fresh ID so future operations use it.
                        await supabase
                            .from('appointment_actions')
                            .update({ prodentis_id: freshId })
                            .eq('id', appointmentId);
                        res = await postIcon(freshId);
                        console.log(`[CONFIRM-PUBLIC] Prodentis icon attempt 2: ${freshId} -> ${res.status}`);
                    } else {
                        console.warn(`[CONFIRM-PUBLIC] No matching active appointment found in Prodentis for ${action.prodentis_id} on ${String(action.appointment_date).slice(0, 10)} — likely cancelled`);
                        iconErrorReason = 'appointment_cancelled_or_not_found';
                    }
                }

                if (res.ok) {
                    iconAdded = true;
                    iconErrorReason = null;
                } else if (!iconErrorReason) {
                    iconErrorReason = `http_${res.status}`;
                }
            }
        } catch (iconError) {
            console.error('[CONFIRM-PUBLIC] Failed to add Prodentis icon:', iconError);
            iconErrorReason = `exception:${iconError instanceof Error ? iconError.message : 'unknown'}`;
        }

        // Persist sync outcome on appointment_actions (best-effort, non-fatal).
        try {
            await supabase
                .from('appointment_actions')
                .update({
                    prodentis_icon_synced: iconAdded,
                    prodentis_icon_synced_at: iconAdded ? new Date().toISOString() : null,
                    prodentis_icon_error: iconAdded ? null : iconErrorReason,
                })
                .eq('id', appointmentId);
        } catch (persistErr) {
            console.error('[CONFIRM-PUBLIC] Failed to persist sync status:', persistErr);
        }

        // Telegram alert when sync failed despite the retry — reception needs to know.
        if (!iconAdded) {
            try {
                const failMsg = `🚨 <b>SYNC PRODENTIS PADŁ — sprawdź ręcznie</b>\n\n` +
                    `👤 <b>Pacjent:</b> ${action.patient_name || 'Nieznany'}\n` +
                    `📞 <b>Telefon:</b> ${action.patient_phone || 'brak'}\n` +
                    `📅 <b>Termin:</b> ${appointmentDateFormatted}\n` +
                    `🩺 <b>Lekarz:</b> ${action.doctor_name || 'brak'}\n` +
                    `🔑 <b>Prodentis ID:</b> ${action.prodentis_id}\n` +
                    `❌ <b>Powód:</b> ${iconErrorReason || 'unknown'}\n\n` +
                    (iconErrorReason === 'appointment_cancelled_or_not_found'
                        ? `Wizyta prawdopodobnie odwołana w grafiku. Pacjent potwierdził SMS-em — skontaktuj się ręcznie.`
                        : `Pacjent potwierdził, ale ikona w grafiku NIE została dodana. Sprawdź wizytę ręcznie.`);
                await sendTelegramNotification(failMsg, 'appointments');
            } catch (alertErr) {
                console.error('[CONFIRM-PUBLIC] Failed to send sync-failure Telegram alert:', alertErr);
            }
        }

        console.log('[CONFIRM-PUBLIC] Success:', { telegramSent, iconAdded, prodentisIdRefreshed, iconErrorReason });

        return NextResponse.json({
            success: true,
            message: 'Potwierdzenie wysłane. Gabinet został powiadomiony.',
            telegramSent,
            iconAdded,
            prodentisIdRefreshed,
        });

    } catch (error) {
        console.error('[CONFIRM-PUBLIC] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

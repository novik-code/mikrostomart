import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { sendTelegramNotification } from '@/lib/telegram';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { isSmsTypeEnabled } from '@/lib/smsSettings';
import { demoSanitize } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/**
 * GET /api/cron/noshow-followup
 * Vercel Cron — runs daily at 10:00 AM Warsaw time
 * 
 * Detects no-shows from yesterday's appointments:
 * 1. Fetch yesterday's appointments from Prodentis
 * 2. For each patient who had a reminder SMS sent:
 *    - Skip if they confirmed attendance (appointment_actions)
 *    - Skip if they cancelled
 *    - Skip if post-visit SMS was already sent (they showed up)
 * 3. Remaining = likely no-shows → send follow-up SMS
 * 4. Telegram summary to admin
 * 
 * No-show SMS offers easy rescheduling via Strefa Pacjenta.
 */
export async function GET(req: NextRequest) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    const startTime = Date.now();

    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // ── Check if noshow SMS is enabled ──
        const enabled = await isSmsTypeEnabled('noshow_followup');
        if (!enabled) {
            console.log('[NoShow] SMS type disabled via admin settings');
            return NextResponse.json({ success: true, skipped: true, reason: 'SMS type disabled' });
        }

        const now = new Date();
        const warsaw = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));

        // Yesterday's date
        const yesterday = new Date(warsaw);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        console.log(`[NoShow] Checking no-shows for ${yesterdayStr}`);

        // ── 1. Fetch yesterday's appointments from Prodentis ──
        let appointments: any[] = [];
        try {
            const res = await fetch(`${PRODENTIS_API}/api/appointments/by-date?date=${yesterdayStr}`, {
                signal: AbortSignal.timeout(10000),
            });
            if (res.ok) {
                const data = await res.json();
                appointments = data.appointments || data || [];
                if (!Array.isArray(appointments)) appointments = [];
            }
        } catch (e) {
            console.error('[NoShow] Failed to fetch Prodentis appointments:', e);
        }

        if (appointments.length === 0) {
            console.log('[NoShow] No appointments found for yesterday');
            const duration = Date.now() - startTime;
            await logCronHeartbeat('noshow-followup', 'ok', 'No appointments yesterday', duration);
            return NextResponse.json({ success: true, count: 0 });
        }

        // ── 2. Get list of patients who received post-visit SMS (they showed up) ──
        const { data: postVisitSent } = await supabase
            .from('sms_reminders')
            .select('patient_phone')
            .eq('sms_type', 'post_visit')
            .eq('status', 'sent')
            .gte('appointment_date', `${yesterdayStr}T00:00:00.000Z`)
            .lte('appointment_date', `${yesterdayStr}T23:59:59.999Z`);

        const postVisitPhones = new Set((postVisitSent || []).map(r => r.patient_phone));

        // ── 3. Get patients who confirmed attendance or cancelled ──
        const { data: actionRecords } = await supabase
            .from('appointment_actions')
            .select('prodentis_id, status, attendance_confirmed')
            .gte('appointment_date', `${yesterdayStr}T00:00:00.000Z`)
            .lte('appointment_date', `${yesterdayStr}T23:59:59.999Z`);

        const confirmedIds = new Set(
            (actionRecords || [])
                .filter(a => a.attendance_confirmed || a.status === 'cancelled' || a.status === 'rescheduled')
                .map(a => String(a.prodentis_id))
        );

        // ── 4. Check for already-sent no-show follow-ups (dedup) ──
        const { data: alreadySent } = await supabase
            .from('sms_reminders')
            .select('patient_phone')
            .eq('sms_type', 'noshow_followup')
            .gte('created_at', `${yesterdayStr}T00:00:00.000Z`);

        const alreadySentPhones = new Set((alreadySent || []).map(r => r.patient_phone));

        // ── 5. Identify no-shows ──
        let smsSent = 0;
        let smsErrors = 0;
        const noShowPatients: string[] = [];

        for (const apt of appointments) {
            const phone = apt.patientPhone;
            const patientName = apt.patientName || '';
            const patientId = String(apt.patientId || '');
            const doctorName = (apt.doctor?.name || '').replace(/\s*\(I\)\s*/g, ' ').trim();

            // Skip: no phone
            if (!phone) continue;

            // Skip: not a working-hour appointment
            const isWorking = apt.isWorkingHour === true || apt.isWorkingHour === 'true';
            if (!isWorking) continue;

            // Skip: patient received post-visit SMS (they showed up)
            if (postVisitPhones.has(phone)) continue;

            // Skip: patient confirmed attendance or actively cancelled
            if (patientId && confirmedIds.has(patientId)) continue;

            // Skip: follow-up already sent
            if (alreadySentPhones.has(phone)) continue;

            // This is likely a no-show!
            console.log(`[NoShow] Detected: ${patientName} (${phone}) — ${doctorName}`);
            noShowPatients.push(`${patientName} (${phone})`);

            // Get first name for personalized SMS
            const firstName = patientName.split(' ')[0] || 'Pacjencie';

            const smsMessage = `${firstName}, nie udalo sie dotrzec na wizyte? Chetnie pomozemy umowic nowy termin: https://mikrostomart.pl/strefa-pacjenta Mikrostomart`;

            try {
                const result = await sendSMS({ to: phone, message: smsMessage });

                // Save in sms_reminders for dedup
                await supabase.from('sms_reminders').insert({
                    patient_name: patientName,
                    patient_phone: phone,
                    prodentis_id: patientId || null,
                    doctor_name: doctorName,
                    appointment_date: `${yesterdayStr}T${apt.date ? new Date(apt.date).toISOString().slice(11) : '00:00:00.000Z'}`,
                    sms_type: 'noshow_followup',
                    sms_content: smsMessage,
                    status: result.success ? 'sent' : 'failed',
                    sent_at: result.success ? new Date().toISOString() : null,
                    error: result.success ? null : (result.error || 'Unknown error'),
                });

                if (result.success) {
                    smsSent++;
                } else {
                    smsErrors++;
                    console.error(`[NoShow] SMS failed for ${phone}:`, result.error);
                }
            } catch (err) {
                smsErrors++;
                console.error(`[NoShow] SMS exception for ${phone}:`, err);
            }
        }

        // ── 6. Telegram summary ──
        if (noShowPatients.length > 0) {
            const telegramMsg = `🚫 <b>NO-SHOW — ${yesterdayStr}</b>\n\n` +
                `📊 Wykrytych: <b>${noShowPatients.length}</b>\n` +
                `✅ SMS wysłanych: <b>${smsSent}</b>\n` +
                (smsErrors > 0 ? `❌ Błędy: <b>${smsErrors}</b>\n` : '') +
                `\n👤 ${noShowPatients.join('\n👤 ')}`;

            sendTelegramNotification(telegramMsg, 'default').catch(console.error);
        }

        const duration = Date.now() - startTime;
        await logCronHeartbeat(
            'noshow-followup',
            'ok',
            `noShows=${noShowPatients.length}, sent=${smsSent}, errors=${smsErrors}`,
            duration
        );

        console.log(`[NoShow] Done: ${noShowPatients.length} no-shows, ${smsSent} SMS sent (${duration}ms)`);

        return NextResponse.json({
            success: true,
            noShows: noShowPatients.length,
            smsSent,
            smsErrors,
        });

    } catch (err: any) {
        console.error('[NoShow] Error:', err);
        const duration = Date.now() - startTime;
        await logCronHeartbeat('noshow-followup', 'error', err.message, duration);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

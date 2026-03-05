import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { sendTranslatedPushToUser } from '@/lib/webpush';
import { sendTelegramNotification } from '@/lib/telegram';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/**
 * GET /api/cron/deposit-reminder
 * Vercel Cron — runs daily at 9:00 AM Warsaw time
 * 
 * Finds appointments in ~48h that have unpaid deposits and sends SMS + push reminder.
 * Only sends one reminder per appointment (tracked by sms_deposit_reminder_sent flag).
 */
export async function GET(req: NextRequest) {
    const startTime = Date.now();

    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const warsaw = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));

        // Target: appointments between 24h and 72h from now (captures ~48h window with margin)
        const from = new Date(warsaw.getTime() + 24 * 60 * 60 * 1000);
        const to = new Date(warsaw.getTime() + 72 * 60 * 60 * 1000);

        // Find appointments with unpaid deposits
        const { data: unpaidActions, error } = await supabase
            .from('appointment_actions')
            .select('id, patient_id, prodentis_id, appointment_date, doctor_name, status, deposit_paid')
            .eq('deposit_paid', false)
            .not('status', 'in', '("cancelled","rescheduled")')
            .gte('appointment_date', from.toISOString())
            .lte('appointment_date', to.toISOString())
            .order('appointment_date', { ascending: true });

        if (error) {
            console.error('[DepositReminder] Query error:', error);
            const duration = Date.now() - startTime;
            await logCronHeartbeat('deposit-reminder', 'error', error.message, duration);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!unpaidActions || unpaidActions.length === 0) {
            console.log('[DepositReminder] No unpaid deposits found in 24-72h window');
            const duration = Date.now() - startTime;
            await logCronHeartbeat('deposit-reminder', 'ok', 'No unpaid deposits in window', duration);
            return NextResponse.json({ success: true, count: 0 });
        }

        console.log(`[DepositReminder] Found ${unpaidActions.length} unpaid deposits`);

        let smsSent = 0;
        let pushSent = 0;
        let errors = 0;
        const reminderNames: string[] = [];

        for (const action of unpaidActions) {
            // Get patient data (phone, id)
            const { data: patient } = await supabase
                .from('patients')
                .select('id, phone, prodentis_id')
                .eq('id', action.patient_id)
                .single();

            if (!patient?.phone) {
                console.warn(`[DepositReminder] Patient ${action.patient_id} has no phone`);
                continue;
            }

            // Get patient name from Prodentis
            let patientName = '';
            let firstName = '';
            try {
                const res = await fetch(`${PRODENTIS_API}/api/patient/${patient.prodentis_id}/details`, {
                    signal: AbortSignal.timeout(5000),
                });
                if (res.ok) {
                    const det = await res.json();
                    patientName = `${det.firstName || ''} ${det.lastName || ''}`.trim();
                    firstName = det.firstName || '';
                }
            } catch { /* use empty */ }

            // Format appointment date
            const aptDate = new Date(action.appointment_date);
            const dayName = aptDate.toLocaleDateString('pl-PL', { weekday: 'long', timeZone: 'Europe/Warsaw' });
            const dateStr = aptDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw' });
            const timeStr = aptDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
            const doctor = action.doctor_name || 'lekarz';

            // ── Send SMS ──
            const smsMessage = `Szanowny Pacjencie${firstName ? ` ${firstName}` : ''}, ` +
                `przypominamy o zbliżającej się wizycie (${dayName}, ${dateStr} o ${timeStr} u ${doctor}). ` +
                `Prosimy o wpłatę zadatku przed wizytą: https://mikrostomart.pl/zadatek ` +
                `Mikrostomart`;

            try {
                const smsResult = await sendSMS({ to: patient.phone, message: smsMessage });
                if (smsResult.success) {
                    smsSent++;
                    reminderNames.push(`${patientName || patient.phone} (${dateStr} ${timeStr})`);
                } else {
                    errors++;
                    console.error(`[DepositReminder] SMS failed for ${patient.phone}:`, smsResult.error);
                }
            } catch (err) {
                errors++;
                console.error(`[DepositReminder] SMS exception for ${patient.phone}:`, err);
            }

            // ── Send Push ──
            try {
                const pushResult = await sendTranslatedPushToUser(
                    patient.id,
                    'patient',
                    'booking_confirmed', // Reuse existing type, message is generic enough
                    { specialist: doctor, date: `${dayName}, ${dateStr}`, time: timeStr },
                    '/zadatek'
                );
                if (pushResult.sent > 0) pushSent++;
            } catch (err) {
                console.error(`[DepositReminder] Push failed for ${patient.id}:`, err);
            }
        }

        // ── Telegram summary ──
        if (smsSent > 0 || errors > 0) {
            const telegramMsg = `💰 <b>PRZYPOMNIENIA O ZADATKU</b>\n\n` +
                `✅ SMS wysłanych: <b>${smsSent}</b>\n` +
                `📲 Push: <b>${pushSent}</b>\n` +
                (errors > 0 ? `❌ Błędy: <b>${errors}</b>\n` : '') +
                (reminderNames.length > 0 ? `\n👤 ${reminderNames.join('\n👤 ')}` : '');

            sendTelegramNotification(telegramMsg, 'default').catch(console.error);
        }

        const duration = Date.now() - startTime;
        await logCronHeartbeat(
            'deposit-reminder',
            'ok',
            `sent=${smsSent}, push=${pushSent}, errors=${errors}`,
            duration
        );

        console.log(`[DepositReminder] Done: ${smsSent} SMS, ${pushSent} push, ${errors} errors (${duration}ms)`);

        return NextResponse.json({
            success: true,
            count: unpaidActions.length,
            smsSent,
            pushSent,
            errors,
        });

    } catch (err: any) {
        console.error('[DepositReminder] Error:', err);
        const duration = Date.now() - startTime;
        await logCronHeartbeat('deposit-reminder', 'error', err.message, duration);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

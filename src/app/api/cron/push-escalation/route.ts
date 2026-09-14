import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { hasPatientResponded } from '@/lib/patientDelivery';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { PREFIKS_ESKALACJI, PREFIKS_ESKALACJA_NIEUDANA, PREFIKS_ESKALACJA_POMINIETA } from '@/lib/opisDostarczenia';

export const maxDuration = 60;

/**
 * Push Escalation Cron — Send SMS if patient didn't respond to push
 *
 * Schedule: Runs hourly between 09:00-18:00 UTC (10:00-19:00 Warsaw)
 *
 * Logic:
 * 1. Find all sms_reminders where delivery_channel='push' AND status='push_sent'
 *    AND push was sent >2h ago AND sms_type='reminder'
 * 2. Check if patient has responded (confirmed/cancelled via appointment_actions)
 * 3. If NOT responded → send SMS as escalation, mark delivery_channel='push+sms'
 * 4. If responded → mark as 'confirmed_via_push', skip SMS
 *
 * Only applies to 'reminder' type (appointment confirmations).
 * Post-visit and week-after-visit are informational — no escalation needed.
 */
export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('🔄 [Push Escalation] Starting...');
    const startTime = Date.now();

    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCronAuth) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let escalatedCount = 0;
    let respondedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
        // Find push-sent reminders that are >2 hours old and need escalation
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        const { data: pushReminders, error: fetchError } = await supabase
            .from('sms_reminders')
            .select('*')
            .eq('status', 'push_sent')
            .eq('sms_type', 'reminder')
            .eq('push_sent', true)
            .lt('push_sent_at', twoHoursAgo)
            .order('push_sent_at', { ascending: true })
            .limit(50);

        if (fetchError) {
            throw new Error(`Failed to fetch push reminders: ${fetchError.message}`);
        }

        if (!pushReminders || pushReminders.length === 0) {
            console.log('ℹ️  [Push Escalation] No push reminders need escalation');
            return NextResponse.json({
                success: true,
                escalated: 0,
                responded: 0,
                failed: 0,
                message: 'No push reminders pending escalation',
            });
        }

        console.log(`📊 [Push Escalation] Found ${pushReminders.length} push reminders to check...`);

        // Dzień KALENDARZOWY gabinetu. `appointment_date` trzyma czas ścienny Warszawy
        // zapisany jako UTC, więc jego pierwsze 10 znaków to już dzień gabinetu.
        const dzisWarszawa = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());

        for (const reminder of pushReminders) {
            try {
                // Check if patient responded to the appointment
                // 🔴 (2026-09-14) Eskalacja WYŁĄCZNIE przed dniem wizyty. Cron chodzi 11:00–20:00,
                // a `push_sent_at` nie ma górnej granicy: szkice wysłane z panelu po 18:00
                // eskalowałyby się następnego ranka, czyli w DNIU wizyty — SMS-em „jutro o …",
                // czasem już po wizycie. Wiersz zamykamy jako dostarczony pushem, z wyjaśnieniem.
                const dzienWizyty = String(reminder.appointment_date || '').slice(0, 10);
                if (!dzienWizyty || dzienWizyty <= dzisWarszawa) {
                    await supabase.from('sms_reminders').update({
                        status: 'sent',
                        delivery_channel: 'push',
                        send_error: `${PREFIKS_ESKALACJA_POMINIETA} wizyta dziś albo już minęła (${dzienWizyty || 'brak daty'})`,
                        updated_at: new Date().toISOString(),
                    }).eq('id', reminder.id);
                    skippedCount++;
                    continue;
                }

                const responded = await hasPatientResponded(
                    String(reminder.prodentis_id),
                    reminder.appointment_date
                );

                if (responded) {
                    // Patient responded — no SMS needed
                    console.log(`  ✅ ${reminder.patient_name}: responded via push — skipping SMS`);
                    await supabase.from('sms_reminders').update({
                        status: 'sent', // Mark as "sent" since push was the delivery
                        delivery_channel: 'push',
                        send_error: null,
                        updated_at: new Date().toISOString(),
                    }).eq('id', reminder.id);
                    respondedCount++;
                    continue;
                }

                // Patient didn't respond — escalate to SMS
                console.log(`  📱 ${reminder.patient_name}: no response — escalating to SMS`);

                const smsResult = await sendSMS({
                    to: reminder.phone,
                    message: reminder.sms_message,
                });

                if (smsResult.success) {
                    await supabase.from('sms_reminders').update({
                        status: 'sent',
                        delivery_channel: 'push+sms',
                        sent_at: new Date().toISOString(),
                        sms_message_id: smsResult.messageId,
                        send_error: `${PREFIKS_ESKALACJI} pacjent nie odpowiedział na push w ciągu 2h`,
                        updated_at: new Date().toISOString(),
                    }).eq('id', reminder.id);
                    escalatedCount++;
                    console.log(`  ✅ SMS escalation sent (ID: ${smsResult.messageId})`);
                } else {
                    // 🔑 Status ZOSTAJE `push_sent`: push doszedł, a `failed` skasowałoby wiersz przy
                    // najbliższym czyszczeniu szkiców (znów zniknąłby ślad pusha). Następny przebieg
                    // spróbuje ponownie — do dnia wizyty, potem bramka wyżej zamyka wiersz.
                    await supabase.from('sms_reminders').update({
                        send_error: `${PREFIKS_ESKALACJA_NIEUDANA} ${smsResult.error}`,
                        updated_at: new Date().toISOString(),
                    }).eq('id', reminder.id);
                    failedCount++;
                    console.error(`  ❌ SMS escalation failed: ${smsResult.error}`);
                }
            } catch (err: any) {
                failedCount++;
                console.error(`  ❌ Error processing ${reminder.patient_name}:`, err.message);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`📊 [Push Escalation] Done in ${duration}s — escalated:${escalatedCount} responded:${respondedCount} failed:${failedCount}`);

        await logCronHeartbeat(
            'push-escalation',
            'ok',
            `Escalated: ${escalatedCount}, Responded: ${respondedCount}, Failed: ${failedCount}, Skipped (dzień wizyty): ${skippedCount}`,
            Date.now() - startTime
        );

        return NextResponse.json({
            success: true,
            escalated: escalatedCount,
            responded: respondedCount,
            failed: failedCount,
            skipped: skippedCount,
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('💥 [Push Escalation] Fatal error:', error.message);
        await logCronHeartbeat('push-escalation', 'error', error.message, Date.now() - startTime);
        return NextResponse.json({
            success: false,
            error: error.message,
            escalated: escalatedCount,
            responded: respondedCount,
            failed: failedCount,
        }, { status: 500 });
    }
}

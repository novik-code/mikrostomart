import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { hasPatientResponded } from '@/lib/patientDelivery';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

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

    if (!isCronAuth && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let escalatedCount = 0;
    let respondedCount = 0;
    let failedCount = 0;

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

        for (const reminder of pushReminders) {
            try {
                // Check if patient responded to the appointment
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
                        send_error: 'Escalation: pacjent nie odpowiedział na push w ciągu 2h',
                        updated_at: new Date().toISOString(),
                    }).eq('id', reminder.id);
                    escalatedCount++;
                    console.log(`  ✅ SMS escalation sent (ID: ${smsResult.messageId})`);
                } else {
                    await supabase.from('sms_reminders').update({
                        status: 'failed',
                        delivery_channel: 'push+sms',
                        send_error: `Push OK, SMS failed: ${smsResult.error}`,
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
            `Escalated: ${escalatedCount}, Responded: ${respondedCount}, Failed: ${failedCount}`,
            Date.now() - startTime
        );

        return NextResponse.json({
            success: true,
            escalated: escalatedCount,
            responded: respondedCount,
            failed: failedCount,
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

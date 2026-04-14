import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushToUser } from '@/lib/pushService';
import { sendSMS, toGSM7 } from '@/lib/smsService';

export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mikrostomart.pl';

/**
 * CareFlow Push + SMS Fallback Cron
 * Runs every 5 minutes (7-21 UTC) via Vercel Cron.
 * 
 * Logic:
 * 1. Find tasks where scheduled_at <= NOW() and not completed/skipped
 * 2. Check push_sent_count < push_max_count
 * 3. Check push_last_sent_at + interval <= NOW()
 * 4. Try push notification first
 * 5. If no push subscription → SMS fallback (once per task)
 * 6. Auto-complete enrollments when all tasks done
 */
export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('🏥 [CareFlow Push] Starting cron...');

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let pushSent = 0;
    let smsSent = 0;
    let skipped = 0;
    let autoCompleted = 0;

    try {
        const now = new Date();
        // Use Warsaw timezone for quiet hours check (not UTC server time)
        const warsawHourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour12: false, hour: 'numeric' }).format(now);
        const currentHourWarsaw = parseInt(warsawHourStr);

        // Quiet hours guard (22:00-07:00 Warsaw time)
        if (currentHourWarsaw >= 22 || currentHourWarsaw < 7) {
            console.log(`🏥 [CareFlow Push] Quiet hours (Warsaw: ${currentHourWarsaw}:00) — skipping all`);
            return NextResponse.json({ success: true, skipped: 'quiet_hours' });
        }

        // Find pending tasks: scheduled_at <= now, not completed, not skipped
        const { data: pendingTasks, error } = await supabase
            .from('care_tasks')
            .select(`
                id, title, description, icon, push_message, scheduled_at,
                push_sent_count, push_last_sent_at, push_max_count, push_interval_minutes,
                sms_sent, enrollment_id,
                care_enrollments!inner(id, patient_db_id, patient_name, patient_phone, status, access_token)
            `)
            .is('completed_at', null)
            .is('skipped_at', null)
            .lte('scheduled_at', now.toISOString())
            .eq('care_enrollments.status', 'active');

        if (error) {
            console.error('🏥 [CareFlow Push] Query error:', error);
            throw new Error(error.message);
        }

        console.log(`🏥 [CareFlow Push] Found ${pendingTasks?.length || 0} pending tasks`);

        for (const task of (pendingTasks || [])) {
            const enrollment = (task as any).care_enrollments;
            if (!enrollment) { skipped++; continue; }

            // Check push limits
            if (task.push_max_count && task.push_sent_count >= task.push_max_count) {
                // Max pushes reached — try SMS fallback if not already sent
                if (!(task as any).sms_sent && enrollment.patient_phone) {
                    await sendSmsFallback(supabase, task, enrollment, now);
                    smsSent++;
                }
                continue;
            }

            // Check interval since last push
            if (task.push_last_sent_at && task.push_interval_minutes) {
                const lastSent = new Date(task.push_last_sent_at);
                const nextAllowed = new Date(lastSent.getTime() + task.push_interval_minutes * 60 * 1000);
                if (now < nextAllowed) {
                    continue;
                }
            }

            const patientDbId = enrollment.patient_db_id;
            const landingUrl = `${SITE_URL}/opieka/${enrollment.access_token}`;
            const pushTitle = task.icon ? `${task.icon} CareFlow` : '🏥 CareFlow';
            const pushBody = (task as any).push_message || task.title;

            // Check if patient has push subscription
            let hasPushSub = false;
            if (patientDbId) {
                const { data: subs } = await supabase
                    .from('push_subscriptions')
                    .select('id')
                    .eq('user_id', patientDbId)
                    .eq('user_type', 'patient')
                    .limit(1);
                hasPushSub = !!(subs && subs.length > 0);
            }

            if (hasPushSub && patientDbId) {
                // Try push notification
                try {
                    const result = await pushToUser(
                        patientDbId,
                        'patient',
                        { title: pushTitle, body: pushBody, url: landingUrl }
                    );

                    if (result.sent > 0) {
                        pushSent++;
                        console.log(`   ✅ Push sent to ${enrollment.patient_name}: "${task.title}"`);

                        // Update push tracking
                        await supabase
                            .from('care_tasks')
                            .update({
                                push_sent_count: (task.push_sent_count || 0) + 1,
                                push_last_sent_at: now.toISOString(),
                            })
                            .eq('id', task.id);

                        // Audit log
                        await supabase.from('care_audit_log').insert({
                            enrollment_id: task.enrollment_id,
                            task_id: task.id,
                            action: 'push_sent',
                            actor: 'system',
                            details: { push_count: (task.push_sent_count || 0) + 1, title: task.title },
                        });
                    } else {
                        // Push failed — try SMS fallback
                        if (!(task as any).sms_sent && enrollment.patient_phone) {
                            await sendSmsFallback(supabase, task, enrollment, now);
                            smsSent++;
                        } else {
                            skipped++;
                        }
                    }
                } catch (pushErr: any) {
                    console.error(`   ❌ Push failed for ${enrollment.patient_name}:`, pushErr.message);
                    // Push error — try SMS fallback
                    if (!(task as any).sms_sent && enrollment.patient_phone) {
                        await sendSmsFallback(supabase, task, enrollment, now);
                        smsSent++;
                    } else {
                        skipped++;
                    }
                }
            } else {
                // No push subscription — SMS fallback (only once per task)
                if (!(task as any).sms_sent && enrollment.patient_phone) {
                    await sendSmsFallback(supabase, task, enrollment, now);
                    smsSent++;
                } else if (!(task as any).sms_sent) {
                    console.log(`   ⏭ ${enrollment.patient_name}: no push sub, no phone — cannot notify`);
                    skipped++;
                } else {
                    // SMS already sent for this task, just skip
                    continue;
                }
            }
        }

        // ─── Auto-complete enrollments where all tasks are done ───
        try {
            const { data: activeEnrollments } = await supabase
                .from('care_enrollments')
                .select('id')
                .eq('status', 'active');

            for (const enrollment of (activeEnrollments || [])) {
                const { data: incompleteTasks } = await supabase
                    .from('care_tasks')
                    .select('id')
                    .eq('enrollment_id', enrollment.id)
                    .is('completed_at', null)
                    .is('skipped_at', null)
                    .limit(1);

                if (!incompleteTasks || incompleteTasks.length === 0) {
                    await supabase
                        .from('care_enrollments')
                        .update({ status: 'completed', completed_at: now.toISOString() })
                        .eq('id', enrollment.id);

                    await supabase.from('care_audit_log').insert({
                        enrollment_id: enrollment.id,
                        action: 'auto_completed',
                        actor: 'system',
                        details: { reason: 'All tasks completed or skipped' },
                    });

                    autoCompleted++;
                    console.log(`   ✅ Auto-completed enrollment: ${enrollment.id}`);
                }
            }
        } catch (acErr: any) {
            console.error('🏥 [CareFlow Push] Auto-complete error:', acErr.message);
        }

        console.log(`🏥 [CareFlow Push] Done: push=${pushSent}, sms=${smsSent}, skipped=${skipped}, auto-completed=${autoCompleted}`);
        return NextResponse.json({ success: true, pushSent, smsSent, skipped, autoCompleted });
    } catch (err: any) {
        console.error('🏥 [CareFlow Push] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * Send SMS fallback for a CareFlow task.
 * Only sends ONCE per task (marks sms_sent=true).
 * Message: task title + link to patient landing page.
 */
async function sendSmsFallback(
    supabase: any,
    task: any,
    enrollment: any,
    now: Date
) {
    const landingUrl = `${SITE_URL}/opieka/${enrollment.access_token}`;
    const phone = enrollment.patient_phone?.replace(/\s+/g, '').replace(/^\+/, '');

    if (!phone || !/^48\d{9}$/.test(phone)) {
        console.log(`   ⏭ SMS skip ${enrollment.patient_name}: invalid phone "${enrollment.patient_phone}"`);
        return;
    }

    // Build SMS message (GSM-7 safe, max 160 chars)
    const taskTitle = toGSM7(task.title || 'CareFlow');
    const rawMessage = `CareFlow: ${taskTitle}. Sprawdz: ${landingUrl}`;
    // toGSM7 truncates to 160 chars
    const smsMessage = toGSM7(rawMessage);

    try {
        const result = await sendSMS({ to: phone, message: smsMessage });

        if (result.success) {
            console.log(`   📱 SMS sent to ${enrollment.patient_name}: "${taskTitle}"`);

            // Mark task as SMS sent (so we don't resend)
            await supabase
                .from('care_tasks')
                .update({
                    sms_sent: true,
                    push_sent_count: (task.push_sent_count || 0) + 1,
                    push_last_sent_at: now.toISOString(),
                })
                .eq('id', task.id);

            // Audit log
            await supabase.from('care_audit_log').insert({
                enrollment_id: task.enrollment_id,
                task_id: task.id,
                action: 'sms_fallback_sent',
                actor: 'system',
                details: {
                    phone,
                    title: task.title,
                    message_id: result.messageId,
                },
            });
        } else {
            console.error(`   ❌ SMS failed for ${enrollment.patient_name}: ${result.error}`);
        }
    } catch (smsErr: any) {
        console.error(`   ❌ SMS error for ${enrollment.patient_name}:`, smsErr.message);
    }
}

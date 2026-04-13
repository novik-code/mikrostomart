import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushToUser } from '@/lib/pushService';

export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mikrostomart.pl';

/**
 * CareFlow Push Notification Cron
 * Runs every 5 minutes via Vercel Cron.
 * 
 * Logic:
 * 1. Find tasks where scheduled_at <= NOW() and not completed/skipped
 * 2. Check push_sent_count < push_max_count
 * 3. Check push_last_sent_at + interval <= NOW()
 * 4. Send push with deep link to landing page
 * 5. Update push tracking fields
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

    let sent = 0;
    let skipped = 0;
    let autoCompleted = 0;

    try {
        const now = new Date();
        const currentHour = now.getHours();

        // Find pending tasks: scheduled_at <= now, not completed, not skipped
        const { data: pendingTasks, error } = await supabase
            .from('care_tasks')
            .select(`
                id, title, description, icon, push_message, scheduled_at,
                push_sent_count, push_last_sent_at, push_max_count, push_interval_minutes,
                enrollment_id,
                care_enrollments!inner(id, patient_db_id, patient_name, status, access_token)
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

            // Check quiet hours (default 22:00-7:00) — don't disturb patients at night
            const quietStart = 22;
            const quietEnd = 7;
            if (currentHour >= quietStart || currentHour < quietEnd) {
                // Silent skip — don't log each one
                continue;
            }

            // Check push limits
            if (task.push_max_count && task.push_sent_count >= task.push_max_count) {
                // Max pushes reached, skip
                continue;
            }

            // Check interval since last push
            if (task.push_last_sent_at && task.push_interval_minutes) {
                const lastSent = new Date(task.push_last_sent_at);
                const nextAllowed = new Date(lastSent.getTime() + task.push_interval_minutes * 60 * 1000);
                if (now < nextAllowed) {
                    // Too soon since last push
                    continue;
                }
            }

            // Need patient DB UUID for push
            const patientDbId = enrollment.patient_db_id;
            if (!patientDbId) {
                console.log(`   ⏭ Skipping ${enrollment.patient_name}: no DB ID for push`);
                skipped++;
                continue;
            }

            // Check push subscription exists
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('id')
                .eq('user_id', patientDbId)
                .eq('user_type', 'patient')
                .limit(1);

            if (!subs || subs.length === 0) {
                console.log(`   ⏭ Skipping ${enrollment.patient_name}: no push subscription`);
                skipped++;
                continue;
            }

            // Build push message
            const landingUrl = `${SITE_URL}/opieka/${enrollment.access_token}`;
            const pushTitle = task.icon ? `${task.icon} CareFlow` : '🏥 CareFlow';
            const pushBody = (task as any).push_message || task.title;

            // Send push
            try {
                const result = await pushToUser(
                    patientDbId,
                    'patient',
                    { title: pushTitle, body: pushBody, url: landingUrl }
                );

                if (result.sent > 0) {
                    sent++;
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
                    skipped++;
                }
            } catch (pushErr: any) {
                console.error(`   ❌ Push failed for ${enrollment.patient_name}:`, pushErr.message);
                skipped++;
            }
        }

        // ─── Auto-complete enrollments where all tasks are done ───
        try {
            // Find active enrollments
            const { data: activeEnrollments } = await supabase
                .from('care_enrollments')
                .select('id')
                .eq('status', 'active');

            for (const enrollment of (activeEnrollments || [])) {
                // Check if ALL tasks for this enrollment are completed or skipped
                const { data: incompleteTasks } = await supabase
                    .from('care_tasks')
                    .select('id')
                    .eq('enrollment_id', enrollment.id)
                    .is('completed_at', null)
                    .is('skipped_at', null)
                    .limit(1);

                if (!incompleteTasks || incompleteTasks.length === 0) {
                    // All tasks done → mark enrollment as completed
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

        console.log(`🏥 [CareFlow Push] Done: ${sent} sent, ${skipped} skipped, ${autoCompleted} auto-completed`);
        return NextResponse.json({ success: true, sent, skipped, autoCompleted });
    } catch (err: any) {
        console.error('🏥 [CareFlow Push] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

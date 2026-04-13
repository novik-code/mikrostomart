import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { sendSMS, toGSM7 } from '@/lib/smsService';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mikrostomart.pl';

/**
 * POST /api/admin/careflow/send-sms/[id]
 * Manually trigger SMS fallback for all pending tasks in an enrollment.
 *
 * For each pending task where sms_sent=false:
 * - Sends SMS with task title + CareFlow landing page link
 * - Marks sms_sent=true
 * - Creates audit log entry
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch enrollment
        const { data: enrollment, error: eErr } = await supabase
            .from('care_enrollments')
            .select('id, patient_name, patient_phone, status, access_token')
            .eq('id', id)
            .single();

        if (eErr || !enrollment) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
        }

        if (enrollment.status !== 'active') {
            return NextResponse.json({ error: 'Enrollment is not active' }, { status: 400 });
        }

        // Normalize phone
        const phone = enrollment.patient_phone?.replace(/\s+/g, '').replace(/^\+/, '');
        if (!phone || !/^48\d{9}$/.test(phone)) {
            return NextResponse.json({
                error: `Invalid or missing phone number: "${enrollment.patient_phone || 'brak'}"`,
            }, { status: 400 });
        }

        // 2. Fetch pending tasks that haven't received SMS yet
        const { data: pendingTasks, error: tErr } = await supabase
            .from('care_tasks')
            .select('id, title, sms_sent, push_sent_count')
            .eq('enrollment_id', id)
            .is('completed_at', null)
            .is('skipped_at', null)
            .eq('sms_sent', false)
            .order('sort_order', { ascending: true });

        if (tErr) throw new Error(tErr.message);

        if (!pendingTasks || pendingTasks.length === 0) {
            return NextResponse.json({
                success: true,
                smsSent: 0,
                message: 'No pending tasks without SMS. All tasks either completed or already have SMS sent.',
            });
        }

        const landingUrl = `${SITE_URL}/opieka/${enrollment.access_token}`;
        let smsSent = 0;
        let smsErrors = 0;
        const details: { taskId: string; title: string; success: boolean; error?: string }[] = [];

        // 3. Send SMS for each pending task
        for (const task of pendingTasks) {
            const taskTitle = toGSM7(task.title || 'CareFlow');
            const rawMessage = `CareFlow: ${taskTitle}. Sprawdz: ${landingUrl}`;
            const smsMessage = toGSM7(rawMessage);

            try {
                const result = await sendSMS({ to: phone, message: smsMessage });

                if (result.success) {
                    smsSent++;

                    // Mark task as SMS sent
                    await supabase
                        .from('care_tasks')
                        .update({
                            sms_sent: true,
                            push_sent_count: (task.push_sent_count || 0) + 1,
                            push_last_sent_at: new Date().toISOString(),
                        })
                        .eq('id', task.id);

                    // Audit log
                    await supabase.from('care_audit_log').insert({
                        enrollment_id: id,
                        task_id: task.id,
                        action: 'manual_sms_sent',
                        actor: user.email || 'admin',
                        details: {
                            phone,
                            title: task.title,
                            message_id: result.messageId,
                            triggered_by: 'admin_panel',
                        },
                    });

                    details.push({ taskId: task.id, title: task.title, success: true });
                } else {
                    smsErrors++;
                    details.push({ taskId: task.id, title: task.title, success: false, error: result.error });
                }
            } catch (smsErr: any) {
                smsErrors++;
                details.push({ taskId: task.id, title: task.title, success: false, error: smsErr.message });
            }
        }

        console.log(`[CareFlow SMS] Manual trigger for ${enrollment.patient_name}: ${smsSent} sent, ${smsErrors} errors`);

        return NextResponse.json({
            success: true,
            smsSent,
            smsErrors,
            totalPending: pendingTasks.length,
            details,
            message: smsSent > 0
                ? `Wysłano ${smsSent} SMS do ${enrollment.patient_name}`
                : 'Nie udało się wysłać żadnego SMS',
        });
    } catch (err: any) {
        console.error('[CareFlow SMS] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

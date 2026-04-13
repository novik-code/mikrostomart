import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/careflow/[token]/complete
 * Patient marks a task as completed (checkbox).
 * Public endpoint — token is the auth.
 * Body: { taskId }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        const { taskId } = await req.json();

        if (!token || !taskId) {
            return NextResponse.json({ error: 'Missing token or taskId' }, { status: 400 });
        }

        // Verify token → enrollment
        const { data: enrollment } = await supabase
            .from('care_enrollments')
            .select('id, status, patient_name')
            .eq('access_token', token)
            .single();

        if (!enrollment) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
        }

        if (enrollment.status !== 'active') {
            return NextResponse.json({ error: 'CareFlow is not active' }, { status: 400 });
        }

        // Verify task belongs to this enrollment
        const { data: task } = await supabase
            .from('care_tasks')
            .select('id, title, completed_at, enrollment_id')
            .eq('id', taskId)
            .eq('enrollment_id', enrollment.id)
            .single();

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        if (task.completed_at) {
            return NextResponse.json({ success: true, alreadyCompleted: true });
        }

        // Mark as completed
        const { error } = await supabase
            .from('care_tasks')
            .update({ completed_at: new Date().toISOString() })
            .eq('id', taskId);

        if (error) throw new Error(error.message);

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: enrollment.id,
            task_id: taskId,
            action: 'task_completed',
            actor: 'patient',
            details: { task_title: task.title },
        });

        // Check if all tasks are now completed
        const { data: remaining } = await supabase
            .from('care_tasks')
            .select('id')
            .eq('enrollment_id', enrollment.id)
            .is('completed_at', null)
            .is('skipped_at', null);

        const allDone = !remaining || remaining.length === 0;

        if (allDone) {
            await supabase
                .from('care_enrollments')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', enrollment.id);

            await supabase.from('care_audit_log').insert({
                enrollment_id: enrollment.id,
                action: 'completed',
                actor: 'system',
                details: { reason: 'all_tasks_completed' },
            });
        }

        // Find next pending task for feedback
        const { data: nextTask } = await supabase
            .from('care_tasks')
            .select('title, scheduled_at')
            .eq('enrollment_id', enrollment.id)
            .is('completed_at', null)
            .is('skipped_at', null)
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        return NextResponse.json({
            success: true,
            allDone,
            nextTask: nextTask ? { title: nextTask.title, scheduledAt: nextTask.scheduled_at } : null,
        });
    } catch (err: any) {
        console.error('[CareFlow] Complete task error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

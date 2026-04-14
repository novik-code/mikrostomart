import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/employee/careflow/tasks/[id]
 * Edit individual task fields (scheduled_at, title, description, etc.)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const { id } = await params;

        const body = await req.json();
        const updates: Record<string, any> = {};

        if (body.scheduledAt !== undefined) updates.scheduled_at = body.scheduledAt;
        if (body.title !== undefined) updates.title = body.title;
        if (body.description !== undefined) updates.description = body.description;
        if (body.pushMessage !== undefined) updates.push_message = body.pushMessage;
        if (body.completedAt !== undefined) updates.completed_at = body.completedAt;
        if (body.skippedAt !== undefined) updates.skipped_at = body.skippedAt;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Get task to find enrollment_id for audit
        const { data: task } = await supabase
            .from('care_tasks')
            .select('enrollment_id, title')
            .eq('id', id)
            .single();

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        const { error } = await supabase.from('care_tasks').update(updates).eq('id', id);
        if (error) throw new Error(error.message);

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: task.enrollment_id,
            task_id: id,
            action: 'task_edited',
            actor: user.email || 'employee',
            details: { taskTitle: task.title, updates },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

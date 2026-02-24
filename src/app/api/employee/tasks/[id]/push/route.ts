import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushByConfig } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employee/tasks/[id]/push
 * Manually trigger a push notification for a specific task.
 * Accessible by any authenticated employee or admin.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Use service role client to get session from cookie
    const browserClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: { Cookie: req.headers.get('cookie') || '' },
            },
        }
    );
    const { data: { user } } = await browserClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;

        // Fetch task info for notification body
        const { data: task } = await supabase
            .from('employee_tasks')
            .select('title, patient_name, status')
            .eq('id', id)
            .single();

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const STATUS_LABELS: Record<string, string> = {
            todo: 'Do zrobienia', in_progress: 'W trakcie', done: 'Zrobione', archived: 'Archiwum',
        };

        // Send using task-status config (most appropriate for manual triggers)
        const result = await sendPushByConfig('task-status', {
            title: '🔔 Powiadomienie o zadaniu',
            body: `${task.title}${task.patient_name ? ` — ${task.patient_name}` : ''} [${STATUS_LABELS[task.status] || task.status}]`,
            url: `/pracownik?tab=zadania&taskId=${id}`,
            tag: `task-manual-${id}`,
        });

        return NextResponse.json({ success: true, taskId: id, ...result });
    } catch (error: any) {
        console.error('[Tasks/Push] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

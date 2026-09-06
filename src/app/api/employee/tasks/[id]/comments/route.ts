import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import { sendPushByConfig } from '@/lib/pushService';
import { teamMayHear, bramkaZadania } from '@/lib/taskAccess';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/tasks/[id]/comments
 * Returns all comments for a task.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    /**
     * 🔒 BRAMKA WŁASNOŚCI (P-040). Komentarze cudzego zadania prywatnego to ta sama
     * treść co samo zadanie — tyle że opisana cudzymi słowami.
     */
    const { odmowa } = await bramkaZadania(supabase, id, user.id);
    if (odmowa) return odmowa;

    const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[TaskComments] Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
}

/**
 * POST /api/employee/tasks/[id]/comments
 * Body: { content: string }
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    /**
     * 🔒 BRAMKA WŁASNOŚCI (P-040) przed zapisem — inaczej obcy dopisywał komentarz do
     * cudzego zadania prywatnego, a push o tym komentarzu szedł do CAŁEJ grupy razem
     * z tytułem zadania.
     */
    const { odmowa, task: zadanie } = await bramkaZadania(supabase, id, user.id);
    if (odmowa) return odmowa;

    try {
        const body = await req.json();
        if (!body.content?.trim()) {
            return NextResponse.json({ error: 'Content required' }, { status: 400 });
        }

        // Look up author name from staff/roles
        const authorName = body.authorName || user.email;

        const { data, error } = await supabase
            .from('task_comments')
            .insert({
                task_id: id,
                author_id: user.id,
                author_email: user.email,
                author_name: authorName,
                content: body.content.trim(),
            })
            .select()
            .single();

        if (error) {
            console.error('[TaskComments] Insert error:', error);
            return NextResponse.json({ error: 'Failed' }, { status: 500 });
        }

        // Push notification to all employees (except commenter)
        try {
            const { data: task } = await supabase
                .from('employee_tasks')
                .select('title')
                .eq('id', id)
                .single();

            // 🔇 O zadaniu prywatnym grupa się nie dowiaduje — ani z tytułu, ani z UUID
            // w adresie powiadomienia (P-040).
            if (task && teamMayHear(zadanie)) {
                const commentPreview = body.content.trim().substring(0, 60);
                await sendPushByConfig(
                    'task-comment',
                    {
                        title: '💬 Nowy komentarz',
                        body: `${task.title}: ${commentPreview}`,
                        url: `/pracownik?tab=zadania&taskId=${id}`,
                        tag: `task-comment-${id}`,
                    }
                    // NOTE: no excludeUserId — all configured recipients get the push
                );
            }


        } catch (pushErr) {
            console.error('[TaskComments] Push error:', pushErr);
        }

        return NextResponse.json({ comment: data }, { status: 201 });
    } catch (err: any) {
        console.error('[TaskComments] Error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

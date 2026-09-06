import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { sendPushByConfig } from '@/lib/pushService';
import { teamMayHear, bramkaZadania, taskNotFound } from '@/lib/taskAccess';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employee/tasks/[id]/push
 * Manually trigger a push notification for a specific task.
 * Accessible by any authenticated employee or admin.
 *
 * 🔴 P-040: do 06.09 ta trasa nie sprawdzała nawet ROLI — wystarczyła dowolna sesja
 * Supabase, żeby rozgłosić całej grupie tytuł DOWOLNEGO zadania razem z nazwiskiem
 * pacjenta, zadań prywatnych nie wyłączając. Dziś: `verifyAdmin` + rola (jak w każdej
 * innej trasie zadań) i bramka własności.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const { id } = await params;

        /**
         * 🔒 Zadanie prywatne odpowiada 404 nawet WŁAŚCICIELOWI: ta trasa służy wyłącznie
         * do ogłoszenia zespołowi, a o prywatnym zespół nie ma się dowiedzieć. Brak
         * osobnego kodu dla „jest, ale nie twoje" — 404 znaczy jedno i drugie.
         */
        const { odmowa, task: zadanie } = await bramkaZadania(supabase, id, user.id);
        if (odmowa) return odmowa;
        /**
         * 🔇 Zadanie PRYWATNE nie da się rozgłosić nawet WŁAŚCICIELOWI — ta trasa służy
         * wyłącznie do ogłoszenia zespołowi. Odpowiadamy 403 z jawnym powodem, a NIE 404:
         * właściciel ma zobaczyć „nie rozgłaszamy prywatnych", a nie „nie ma takiego
         * zadania", bo drugie wysyła go szukać usterki tam, gdzie jej nie ma.
         */
        if (!teamMayHear(zadanie)) {
            return NextResponse.json(
                { error: 'Zadanie prywatne — powiadomienia zespołowego nie wysyłamy.', sent: 0 },
                { status: 403 },
            );
        }

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

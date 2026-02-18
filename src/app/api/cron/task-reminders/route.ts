import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendPushToAllEmployees } from '@/lib/webpush';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/task-reminders
 * 
 * Daily cron job (runs at 8:30 UTC = 9:30-10:30 Warsaw time).
 * Finds tasks without due_date that are not done, and sends
 * a Telegram reminder for each one. Repeats every 24h until
 * someone adds a date.
 */
export async function GET(req: Request) {
    console.log('🔔 [TaskReminders] Starting cron job...');

    // Auth check
    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';

    if (!isCronAuth && !isManualTrigger && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Find tasks without due_date that are not done
        const { data: tasks, error } = await supabase
            .from('employee_tasks')
            .select('id, title, task_type, patient_name, assigned_to_doctor_name, created_by_email, created_at')
            .is('due_date', null)
            .neq('status', 'done')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[TaskReminders] DB error:', error);
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        if (!tasks || tasks.length === 0) {
            console.log('[TaskReminders] No tasks without dates found');
            return NextResponse.json({ success: true, reminded: 0 });
        }

        console.log(`[TaskReminders] Found ${tasks.length} tasks without due_date`);

        // Build a single message with all tasks
        let message = `⚠️ <b>ZADANIA BEZ DATY REALIZACJI</b>\n\n`;
        message += `Poniższe zadania nie mają ustawionej daty realizacji.\nProszę uzupełnić.\n\n`;

        for (const task of tasks) {
            const ageMs = Date.now() - new Date(task.created_at).getTime();
            const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

            message += `📋 <b>${task.title}</b>\n`;
            if (task.patient_name) message += `   👤 ${task.patient_name}\n`;
            if (task.assigned_to_doctor_name) message += `   → ${task.assigned_to_doctor_name}\n`;
            message += `   ⏱ Utworzono ${ageDays} dni temu\n\n`;
        }

        message += `📊 Łącznie: ${tasks.length} zadań bez daty`;

        const sent = await sendTelegramNotification(message, 'default');
        console.log(`[TaskReminders] Telegram sent: ${sent}`);

        // Also send push notifications to all employees
        try {
            await sendPushToAllEmployees({
                title: '⚠️ Zadania bez daty realizacji',
                body: `${tasks.length} zadań wymaga uzupełnienia daty`,
                url: '/pracownik',
                tag: 'task-reminders-daily',
            });
        } catch (pushErr) {
            console.error('[TaskReminders] Push error:', pushErr);
        }

        return NextResponse.json({
            success: true,
            reminded: tasks.length,
            telegramSent: sent,
        });

    } catch (error: any) {
        console.error('[TaskReminders] Fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

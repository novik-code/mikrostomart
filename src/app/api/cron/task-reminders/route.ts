import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendPushToGroups, type PushGroup } from '@/lib/webpush';

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
        // Find all active tasks
        const { data: allTasks, error } = await supabase
            .from('employee_tasks')
            .select('id, title, task_type, patient_name, assigned_to_doctor_name, created_by_email, created_at, checklist_items, due_date')
            .neq('status', 'done')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[TaskReminders] DB error:', error);
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        if (!allTasks || allTasks.length === 0) {
            console.log('[TaskReminders] No active tasks found');
            return NextResponse.json({ success: true, reminded: 0 });
        }

        // Filter 1: Tasks without due_date
        const noDateTasks = allTasks.filter(t => t.due_date === null);

        // Filter 2: Tasks with pending deposit-related items (zadatek, zaliczka, wpłata, przedpłata)
        const depositKeywords = ['zadatek', 'wpłac', 'wpłacony', 'wpłata', 'wplata', 'zaliczka', 'przedpłata'];

        const pendingDepositTasks = allTasks.filter(t => {
            if (!t.checklist_items || !Array.isArray(t.checklist_items)) return false;
            return t.checklist_items.some((item: any) => {
                if (item.done) return false;
                const text = item.text.toLowerCase();
                return depositKeywords.some(kw => text.includes(kw));
            });
        });

        if (noDateTasks.length === 0 && pendingDepositTasks.length === 0) {
            console.log('[TaskReminders] No tasks requiring daily reminders found');
            return NextResponse.json({ success: true, reminded: 0 });
        }

        console.log(`[TaskReminders] Found ${noDateTasks.length} tasks without date, ${pendingDepositTasks.length} with pending deposit`);

        // Build Telegram message
        let message = '';

        if (noDateTasks.length > 0) {
            message += `⚠️ <b>ZADANIA BEZ DATY REALIZACJI</b>\n\n`;
            message += `Poniższe zadania nie mają ustawionej daty realizacji. Proszę uzupełnić.\n\n`;

            for (const task of noDateTasks) {
                const ageMs = Date.now() - new Date(task.created_at).getTime();
                const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                message += `📋 <b>${task.title}</b>\n`;
                if (task.patient_name) message += `   👤 ${task.patient_name}\n`;
                if (task.assigned_to_doctor_name) message += `   → ${task.assigned_to_doctor_name}\n`;
                message += `   ⏱ Utworzono ${ageDays} dni temu\n\n`;
            }
        }

        if (pendingDepositTasks.length > 0) {
            if (message) message += `\n---\n\n`;
            message += `💰 <b>NIEWPŁACONY ZADATEK</b>\n\n`;
            message += `W poniższych zadaniach należy pobrać i odznaczyć wpłatę zadatku.\n\n`;

            for (const task of pendingDepositTasks) {
                message += `📋 <b>${task.title}</b>\n`;
                if (task.patient_name) message += `   👤 ${task.patient_name}\n`;
                if (task.due_date) {
                    const dueDateStr = new Date(task.due_date).toLocaleDateString('pl-PL');
                    message += `   📅 Termin: ${dueDateStr}\n`;
                }
                message += `\n`;
            }
        }

        const totalReminded = noDateTasks.length + pendingDepositTasks.length;
        message += `📊 Dodatkowe zadania i zadatki do sprawdzenia: ${totalReminded}`;

        let telegramSent = false;
        if (message) {
            telegramSent = await sendTelegramNotification(message, 'default');
            console.log(`[TaskReminders] Telegram sent: ${telegramSent}`);
        }

        // Send push notifications using DB-configured target groups
        try {
            // Read push config from DB
            const { data: configs } = await supabase
                .from('push_notification_config')
                .select('key, groups, enabled')
                .in('key', ['task-no-date', 'task-deposit']);

            const configMap: Record<string, { groups: string[]; enabled: boolean }> = {};
            for (const c of configs || []) {
                configMap[c.key] = { groups: c.groups || [], enabled: c.enabled };
            }

            if (noDateTasks.length > 0) {
                const cfg = configMap['task-no-date'];
                const groups = (cfg?.enabled !== false && cfg?.groups?.length > 0)
                    ? cfg.groups as PushGroup[]
                    : ['doctors', 'hygienists', 'reception', 'assistant', 'admin'] as PushGroup[];

                await sendPushToGroups(groups, {
                    title: '⚠️ Zadania bez daty realizacji',
                    body: `${noDateTasks.length} zadań wymaga uzupełnienia daty`,
                    url: '/pracownik',
                    tag: 'task-reminders-nodate-daily',
                });
            }

            if (pendingDepositTasks.length > 0) {
                const cfg = configMap['task-deposit'];
                const groups = (cfg?.enabled !== false && cfg?.groups?.length > 0)
                    ? cfg.groups as PushGroup[]
                    : ['doctors', 'hygienists', 'reception', 'assistant', 'admin'] as PushGroup[];

                await sendPushToGroups(groups, {
                    title: '💰 Oczekujące wpłaty zadatku',
                    body: `${pendingDepositTasks.length} zadań czeka na odznaczenie zadatku`,
                    url: '/pracownik',
                    tag: 'task-reminders-deposit-daily',
                });
            }
        } catch (pushErr) {
            console.error('[TaskReminders] Push error:', pushErr);
        }

        return NextResponse.json({
            success: true,
            reminded: totalReminded,
            telegramSent,
        });

    } catch (error: any) {
        console.error('[TaskReminders] Fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

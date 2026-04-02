import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendPushToGroups, sendPushToSpecificUsers, type PushGroup } from '@/lib/pushService';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/task-reminders
 *
 * Runs daily at 8:30 UTC (= ~9:30–10:30 Warsaw time).
 * 1. Finds tasks without due_date → Telegram + push
 * 2. Finds tasks with pending deposit keywords → Telegram + push
 * 3. Processes personal task_reminders table → individual push per owner
 */
export async function GET(req: Request) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
    console.log('🔔 [TaskReminders] Starting cron job...');

    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';

    if (!isCronAuth && !isManualTrigger && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // ── Part 1 & 2: Group task reminders (no-date / deposit) ──────────
        const { data: allTasks, error } = await supabase
            .from('employee_tasks')
            .select('id, title, task_type, patient_name, assigned_to_doctor_name, created_by_email, created_at, checklist_items, due_date')
            .neq('status', 'done')
            .neq('status', 'archived')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[TaskReminders] DB error:', error);
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        const maxAgeMs = 30 * 86400000; // 30 days
        const noDateTasks = (allTasks || []).filter(t =>
            t.due_date === null &&
            (Date.now() - new Date(t.created_at).getTime()) < maxAgeMs
        );

        const depositKeywords = ['zadatek', 'wpłac', 'wpłacony', 'wpłata', 'wplata', 'zaliczka', 'przedpłata'];
        const pendingDepositTasks = (allTasks || []).filter(t => {
            if (!t.checklist_items || !Array.isArray(t.checklist_items)) return false;
            return t.checklist_items.some((item: any) => {
                if (item.done) return false;
                const text = (item.text || item.label || '').toLowerCase();
                return depositKeywords.some(kw => text.includes(kw));
            });
        });

        // Build Telegram message
        let message = '';
        if (noDateTasks.length > 0) {
            message += `⚠️ <b>ZADANIA BEZ DATY REALIZACJI</b>\n\n`;
            for (const task of noDateTasks) {
                const ageDays = Math.floor((Date.now() - new Date(task.created_at).getTime()) / 86400000);
                message += `📋 <b>${task.title}</b>\n`;
                if (task.patient_name) message += `   👤 ${task.patient_name}\n`;
                if (task.assigned_to_doctor_name) message += `   → ${task.assigned_to_doctor_name}\n`;
                message += `   ⏱ Utworzono ${ageDays} dni temu\n\n`;
            }
        }
        if (pendingDepositTasks.length > 0) {
            if (message) message += `\n---\n\n`;
            message += `💰 <b>NIEWPŁACONY ZADATEK</b>\n\n`;
            for (const task of pendingDepositTasks) {
                message += `📋 <b>${task.title}</b>\n`;
                if (task.patient_name) message += `   👤 ${task.patient_name}\n`;
                if (task.due_date) message += `   📅 ${new Date(task.due_date).toLocaleDateString('pl-PL')}\n`;
                message += `\n`;
            }
        }

        const totalReminded = noDateTasks.length + pendingDepositTasks.length;
        if (message) message += `📊 Zadania do sprawdzenia: ${totalReminded}`;

        let telegramSent = false;
        if (message) {
            telegramSent = await sendTelegramNotification(message, 'default');
        }

        // Push for group tasks
        try {
            const { data: configs } = await supabase
                .from('push_notification_config')
                .select('key, groups, enabled')
                .in('key', ['task-no-date', 'task-deposit']);

            const configMap: Record<string, { groups: string[]; enabled: boolean }> = {};
            for (const c of configs || []) configMap[c.key] = { groups: c.groups || [], enabled: c.enabled };

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
            console.error('[TaskReminders] Group push error:', pushErr);
        }

        // ── Part 3: Personal task_reminders (AI-created private tasks) ────
        let personalSent = 0;
        try {
            const now = new Date().toISOString();
            const { data: personalReminders } = await supabase
                .from('task_reminders')
                .select('id, task_id, user_id, employee_tasks(title, due_date, due_time, checklist_items, status)')
                .lte('remind_at', now)
                .eq('reminded', false)
                .limit(200);

            if (personalReminders && personalReminders.length > 0) {
                const processedIds: string[] = [];

                for (const reminder of personalReminders) {
                    const task = reminder.employee_tasks as any;
                    if (!task) { processedIds.push(reminder.id); continue; }

                    if (task.status === 'done' || task.status === 'archived') {
                        processedIds.push(reminder.id);
                        continue;
                    }

                    const checklist = (task.checklist_items || []) as Array<{ label: string; done: boolean }>;
                    if (checklist.length > 0 && checklist.every(c => c.done)) {
                        processedIds.push(reminder.id);
                        continue;
                    }

                    const pendingItems = checklist.filter(c => !c.done);
                    const timeStr = task.due_time ? ` o ${String(task.due_time).slice(0, 5)}` : '';
                    const dateStr = task.due_date
                        ? ` (${new Date(task.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}${timeStr})`
                        : '';
                    const notifBody = pendingItems.length > 0
                        ? `Do zrobienia: ${pendingItems.slice(0, 3).map((i: any) => i.label).join(', ')}${pendingItems.length > 3 ? '…' : ''}`
                        : `Termin${dateStr}`;

                    const result = await sendPushToSpecificUsers([reminder.user_id], {
                        title: `⏰ ${task.title}`,
                        body: notifBody,
                        url: '/pracownik',
                        tag: `task-reminder-${reminder.task_id}`,
                    });
                    personalSent += result.sent;
                    processedIds.push(reminder.id);
                }

                if (processedIds.length > 0) {
                    await supabase.from('task_reminders').update({ reminded: true }).in('id', processedIds);
                }
                console.log(`[TaskReminders] Personal: sent=${personalSent} processed=${processedIds.length}`);
            }
        } catch (personalErr) {
            console.error('[TaskReminders] Personal reminders error:', personalErr);
        }

        await logCronHeartbeat('task-reminders', 'ok', `Reminded: ${totalReminded}, Personal: ${personalSent}`);
        return NextResponse.json({ success: true, reminded: totalReminded, personalSent, telegramSent });

    } catch (error: any) {
        console.error('[TaskReminders] Fatal error:', error);
        await logCronHeartbeat('task-reminders', 'error', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

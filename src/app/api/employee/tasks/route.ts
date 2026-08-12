import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendPushByConfig, pushToUsers } from '@/lib/pushService';
import { assigneeUserIds } from '@/lib/taskAssignees';
import { resolveObjectPaths, TASK_IMAGE_BUCKET } from '@/lib/privateStorage';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/tasks?status=todo&assignedTo=doctorId&mine=true
 * 
 * Lists all tasks. Optional filters:
 * - status: 'todo' | 'in_progress' | 'done'
 * - assignedTo: Prodentis doctor ID
 * - mine: 'true' to filter by current user's tasks
 */
export async function GET(req: Request) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const assignedTo = url.searchParams.get('assignedTo');
    const includePrivate = url.searchParams.get('includePrivate') !== 'false'; // default true

    let query = supabase
        .from('employee_tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (assignedTo) query = query.eq('assigned_to_doctor_id', assignedTo);

    const { data, error } = await query;
    if (error) {
        console.error('[Tasks] Error listing tasks:', error);
        return NextResponse.json({ error: 'Failed to list tasks' }, { status: 500 });
    }

    // Filter: private tasks visible only to their owner
    const tasks = (data || []).filter(t => {
        if (!t.is_private) return true; // public task — visible to all
        if (!includePrivate) return false; // caller opted out of private tasks
        return t.owner_user_id === user.id; // private: only owner sees it
    });

    return NextResponse.json({ tasks });
}

/**
 * POST /api/employee/tasks
 * 
 * Creates a new task.
 * Body: { title, description?, status?, priority?, patient_id?, patient_name?,
 *         appointment_type?, due_date?, linked_appointment_date?, linked_appointment_info?,
 *         assigned_to_doctor_id?, assigned_to_doctor_name? }
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const body = await req.json();

        if (!body.title || body.title.trim().length === 0) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        /**
         * 🔒 Klucze obiektów wyliczamy PO STRONIE SERWERA z adresów, które przysłał klient.
         *
         * Apka 1.2.0 ze sklepu wysyła wyłącznie adresy (`uploadTaskImage` zwraca `url`
         * i ona go odsyła) — nie da się jej nauczyć ścieżek bez nowej binarki. Wyliczenie
         * robi baza (`resolve_object_paths`, migracja 192), żeby reguła istniała w JEDNYM
         * miejscu i backfill nie rozjechał się z API.
         *
         * Gdy RPC nie odpowie (np. migracja jeszcze niewgrana), zapisujemy sam adres —
         * kolumna zostaje pusta i wiersz dobierze kolejny przebieg `storage_backfill_apply()`.
         */
        const wejsciowe: string[] = Array.isArray(body.image_urls) ? body.image_urls : [];
        const sciezki = await resolveObjectPaths(wejsciowe, TASK_IMAGE_BUCKET);
        const sciezkaPojedyncza = body.image_url
            ? (await resolveObjectPaths([body.image_url], TASK_IMAGE_BUCKET))?.[0] ?? null
            : null;

        const task = {
            title: body.title.trim(),
            description: body.description?.trim() || null,
            status: body.status || 'todo',
            priority: body.priority || 'normal',
            task_type: body.task_type || null,
            checklist_items: body.checklist_items || [],
            image_url: body.image_url || null,
            image_urls: body.image_urls || [],
            ...(sciezki ? { image_paths: sciezki.filter((p): p is string => !!p) } : {}),
            ...(sciezkaPojedyncza ? { image_path: sciezkaPojedyncza } : {}),
            patient_id: body.patient_id || null,
            patient_name: body.patient_name || null,
            appointment_type: body.appointment_type || null,
            due_date: body.due_date || null,
            due_time: body.due_time || null,
            linked_appointment_date: body.linked_appointment_date || null,
            linked_appointment_info: body.linked_appointment_info || null,
            assigned_to_doctor_id: body.assigned_to_doctor_id || null,
            assigned_to_doctor_name: body.assigned_to_doctor_name || null,
            assigned_to: body.assigned_to || [],
            label_ids: Array.isArray(body.label_ids) ? body.label_ids : [], // mig 180
            // Private task support
            is_private: body.is_private === true,
            owner_user_id: body.is_private ? user.id : null,
            created_by: user.id,
            created_by_email: user.email,
        };

        const { data, error } = await supabase
            .from('employee_tasks')
            .insert(task)
            .select()
            .single();

        if (error) {
            console.error('[Tasks] Error creating task:', error);
            return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
        }

        // Skip Telegram/push for private personal tasks (only visible to owner)
        if (!task.is_private) {
            try {
                const dueDateStr = task.due_date
                    ? new Date(task.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '⚠️ BRAK DATY';

                let tgMessage = `✅ <b>NOWE ZADANIE</b>\n\n`;
                tgMessage += `📋 <b>${task.title}</b>\n`;
                if (task.task_type) tgMessage += `🦷 Typ: ${task.task_type}\n`;
                if (task.patient_name) tgMessage += `👤 Pacjent: ${task.patient_name}\n`;
                const assignedNames = (task.assigned_to || []).map((a: any) => a.name).filter(Boolean);
                if (assignedNames.length > 0) tgMessage += `→ Przypisano do: ${assignedNames.join(', ')}\n`;
                tgMessage += `📅 Termin: ${dueDateStr}\n`;
                tgMessage += `✍️ Utworzył: ${user.email}`;

                await sendTelegramNotification(tgMessage, 'default');

                await sendPushByConfig(
                    'task-new',
                    {
                        title: '📋 Nowe zadanie',
                        body: `${task.title}${task.patient_name ? ` — ${task.patient_name}` : ''}`,
                        // 🔒 Ekran blokady dostaje sam FAKT — tytuł zadania rutynowo zawiera nazwisko
                        // pacjenta, a `patient_name` dokłada je wprost. Pełna treść zostaje w historii
                        // i w apce po tapnięciu (`url` niesie `taskId`).
                        neutral: { body: 'Otwórz, aby zobaczyć szczegóły.' },
                        url: `/pracownik?tab=zadania&taskId=${data.id}`,
                        tag: `task-new-${data.id}`,
                    }
                );
            } catch (tgErr) {
                console.error('[Tasks] Telegram notification error:', tgErr);
            }
        }

        // Push IMIENNY do osób przypisanych — także przy zadaniu prywatnym (przypisany ma do niego
        // dostęp) i także gdy autor przypisał sam siebie. Osobny `tag`, żeby nie nadpisywał ogłoszenia
        // zespołowego. Fire-and-forget: powiadomienie nie może wywrócić utworzenia zadania.
        try {
            const targets = assigneeUserIds(task.assigned_to);
            if (targets.length > 0) {
                await pushToUsers(targets, {
                    title: '📌 Przypisano Ci zadanie',
                    body: `${task.title}${task.patient_name ? ` — ${task.patient_name}` : ''}`,
                    // 🔒 Ekran blokady dostaje sam FAKT — tytuł zadania rutynowo zawiera nazwisko
                    // pacjenta, a `patient_name` dokłada je wprost. Pełna treść zostaje w historii
                    // i w apce po tapnięciu (`url` niesie `taskId`).
                    neutral: { body: 'Otwórz, aby zobaczyć szczegóły.' },
                    url: `/pracownik?tab=zadania&taskId=${data.id}`,
                    tag: `task-assigned-${data.id}`,
                });
            }
        } catch (assignErr) {
            console.error('[Tasks] Assignee push error:', assignErr);
        }

        return NextResponse.json({ task: data }, { status: 201 });

    } catch (error: any) {
        console.error('[Tasks] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

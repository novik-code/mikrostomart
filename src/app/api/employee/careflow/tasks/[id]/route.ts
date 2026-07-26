import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { PAST_DUE_NOTE, warsawIso } from '@/lib/careflowSchedule';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Odpowiedzi z danymi pacjenta nie mogą osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * Godzina zadania bywa podawana w czasie lokalnym Polski bez offsetu — wtedy baza
 * (timestamptz, sesja w UTC) przesunęłaby ją o 1-2 h. Wartość z offsetem zostaje bez zmian.
 */
function parseLocalDate(value: string): Date {
    const raw = String(value).trim();
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(raw);
    if (match && !hasZone) return new Date(warsawIso(match[1], match[2]));
    return new Date(raw);
}

/**
 * Zdejmuje dopisek o minionym terminie. Po przywróceniu kroku (nowa godzina w przyszłości)
 * zostałby sprzeczny z przypomnieniem: push mówi „weź dawkę", a opis „nie wykonuj samodzielnie".
 */
function stripPastDueNote(description: string | null | undefined): string | null {
    if (!description) return null;
    const cleaned = description
        .split('\n')
        .filter((line) => line.trim() !== PAST_DUE_NOTE)
        .join('\n')
        .trim();
    return cleaned || null;
}

/**
 * PATCH /api/employee/careflow/tasks/[id]
 * Edit individual task fields (scheduled_at, title, description, etc.)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
        const { id } = await params;

        const body = await req.json();
        const updates: Record<string, any> = {};

        let newScheduled: Date | null = null;
        if (body.scheduledAt !== undefined) {
            newScheduled = parseLocalDate(body.scheduledAt);
            if (Number.isNaN(newScheduled.getTime())) {
                return NextResponse.json({ error: 'Nieprawidłowa godzina zadania' }, { status: 400, headers: NO_STORE });
            }
            updates.scheduled_at = newScheduled.toISOString();
        }
        if (body.title !== undefined) updates.title = body.title;
        if (body.description !== undefined) updates.description = body.description;
        if (body.pushMessage !== undefined) updates.push_message = body.pushMessage;
        if (body.completedAt !== undefined) updates.completed_at = body.completedAt;
        if (body.skippedAt !== undefined) updates.skipped_at = body.skippedAt;

        if (Object.keys(updates).length === 0
            && body.pushSentCount === undefined
            && body.pushLastSentAt === undefined
            && body.smsSent === undefined) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: NO_STORE });
        }

        // Get task to find enrollment_id for audit
        const { data: task } = await supabase
            .from('care_tasks')
            .select('enrollment_id, title, scheduled_at, visible_from, skipped_at, description')
            .eq('id', id)
            .maybeSingle();

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404, headers: NO_STORE });

        if (newScheduled) {
            // Przesunięte zadanie musi móc przypomnieć od nowa — bez zerowania zostałoby
            // z wyczerpanym limitem pushy (i z `sms_sent` blokującym fallback).
            updates.push_sent_count = 0;
            updates.push_last_sent_at = null;
            updates.sms_sent = false;
            if (task.visible_from) {
                // Widoczność idzie za godziną z tym samym wyprzedzeniem.
                const lead = new Date(task.scheduled_at).getTime() - new Date(task.visible_from).getTime();
                updates.visible_from = new Date(newScheduled.getTime() - lead).toISOString();
            }
        }

        // Przestawienie pominiętego kroku na godzinę w PRZYSZŁOŚCI = przywrócenie go do wysyłki.
        // Bez tego personel przesuwa „przekreśloną" dawkę na 18:00, dostaje potwierdzenie zapisu,
        // a cron (filtruje `skipped_at IS NULL`) i tak nigdy jej nie wyśle.
        // Jawne `skippedAt` w body ma pierwszeństwo — kto celowo pomija krok, ten go pomija.
        const wasSkipped = !!task.skipped_at;
        if (wasSkipped && body.skippedAt === undefined && newScheduled && newScheduled.getTime() > Date.now()) {
            updates.skipped_at = null;
        }
        const restored = wasSkipped && updates.skipped_at === null;
        // Dopisek „termin minął — nie wykonuj samodzielnie" znika razem ze znacznikiem pominięcia
        // (chyba że wywołujący i tak podmienia opis), inaczej pacjent dostaje sprzeczne polecenia.
        if (restored && body.description === undefined) {
            updates.description = stripPastDueNote(task.description);
        }

        // Jawne zerowanie liczników (np. „przypomnij jeszcze raz") — nadpisuje automat powyżej.
        if (body.pushSentCount !== undefined) updates.push_sent_count = body.pushSentCount;
        if (body.pushLastSentAt !== undefined) updates.push_last_sent_at = body.pushLastSentAt;
        if (body.smsSent !== undefined) updates.sms_sent = body.smsSent;

        const { error } = await supabase.from('care_tasks').update(updates).eq('id', id);
        if (error) {
            console.error('[CareFlow] PATCH task update failed:', error);
            return NextResponse.json({ error: 'Nie udało się zapisać zmian w zadaniu' }, { status: 500, headers: NO_STORE });
        }

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: task.enrollment_id,
            task_id: id,
            action: 'task_edited',
            actor: user.email || 'employee',
            details: { taskTitle: task.title, updates },
        });

        // Przywrócenie kroku (często dawki leku) to decyzja kliniczna — osobny wpis,
        // żeby w historii było widać KTO i KIEDY odblokował wysyłkę, a nie tylko „task_edited".
        if (restored) {
            await supabase.from('care_audit_log').insert({
                enrollment_id: task.enrollment_id,
                task_id: id,
                action: 'task_restored',
                actor: user.email || 'employee',
                details: {
                    taskTitle: task.title,
                    previousSkippedAt: task.skipped_at,
                    previousScheduledAt: task.scheduled_at,
                    newScheduledAt: updates.scheduled_at ?? task.scheduled_at,
                },
            });
        }

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: restored ? 'restore_careflow_task' : 'edit_careflow_task',
            resourceType: 'careflow',
            resourceId: id,
            metadata: {
                enrollment_id: task.enrollment_id,
                taskTitle: task.title,
                fields: Object.keys(updates),
                ...(restored ? { restored: true, previousSkippedAt: task.skipped_at } : {}),
            },
            request: req,
        });

        return NextResponse.json({ success: true, restored }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] PATCH task error:', err);
        return NextResponse.json({ error: 'Nie udało się zapisać zmian w zadaniu' }, { status: 500, headers: NO_STORE });
    }
}

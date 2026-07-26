import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * GET /api/admin/careflow/templates/[id]
 * Get template with all steps.
 *
 * Guard zostaje adminowy — personel czyta protokół przez /api/employee/careflow/templates/[id].
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;
        const { id } = await params;

        const { data: template, error } = await supabase
            .from('care_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !template) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

        const { data: steps } = await supabase
            .from('care_template_steps')
            .select('*')
            .eq('template_id', id)
            .order('sort_order', { ascending: true });

        // Count active enrollments
        const { count } = await supabase
            .from('care_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('template_id', id)
            .eq('status', 'active');

        logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'view_careflow_template', resourceType: 'careflow_template',
            resourceId: id,
            metadata: { templateName: template.name },
            request: req,
        });

        return NextResponse.json(
            { template: { ...template, steps: steps || [], active_enrollments: count || 0 } },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('[CareFlow] GET template error:', err);
        return NextResponse.json(
            { error: 'Nie udało się pobrać protokołu' },
            { status: 500, headers: NO_STORE }
        );
    }
}

/** Krok przysłany przez edytor protokołu. `id` obecne = krok już istnieje w bazie. */
type StepPayload = {
    id?: string;
    sort_order?: number;
    title?: string;
    description?: string;
    icon?: string;
    offset_hours?: number;
    smart_snap?: boolean;
    push_message?: string;
    is_recurring?: boolean;
    recurrence_count?: number;
    recurrence_interval_hours?: number;
    reminder_interval_minutes?: number;
    reminder_max_count?: number;
    requires_confirmation?: boolean;
    medication_index?: number | null;
    visible_hours_before?: number | null;
};

/**
 * Kolumny wiersza `care_template_steps` dla jednego kroku.
 *
 * Przy `update` pomijamy pola, których edytor w ogóle nie przysłał — panel nie zna
 * `is_recurring`/`recurrence_*`, więc bezwarunkowy zapis wyzerowałby rekurencję
 * ustawioną w bazie (seedowe protokoły lekowe).
 */
function stepColumns(s: StepPayload, index: number, mode: 'insert' | 'update'): Record<string, unknown> {
    const columns: Record<string, unknown> = {
        sort_order: s.sort_order ?? index + 1,
        title: s.title,
        offset_hours: s.offset_hours,
    };

    const optional: Record<string, unknown> = {
        description: s.description || '',
        icon: s.icon || '💊',
        smart_snap: s.smart_snap ?? true,
        push_message: s.push_message || '',
        is_recurring: s.is_recurring ?? false,
        recurrence_count: s.recurrence_count ?? 0,
        recurrence_interval_hours: s.recurrence_interval_hours ?? 8,
        // Domyślna kadencja: 3 przypomnienia co 45 min. `??`, nie `||` —
        // jawne 0 (brak przypomnień) musi przetrwać zapis.
        reminder_interval_minutes: s.reminder_interval_minutes ?? 45,
        reminder_max_count: s.reminder_max_count ?? 3,
        requires_confirmation: s.requires_confirmation ?? true,
        medication_index: s.medication_index ?? null,
        visible_hours_before: s.visible_hours_before ?? null,
    };

    for (const [key, value] of Object.entries(optional)) {
        if (mode === 'insert' || key in s) columns[key] = value;
    }

    return columns;
}

type SyncResult = { retained: number } | { error: string; status: number };

/**
 * Synchronizuje kroki protokołu PO ID zamiast kasować komplet i wstawiać od nowa.
 *
 * `care_tasks.step_id` to FK bez ON DELETE, więc `DELETE ... WHERE template_id = ?`
 * wywracał się na 23503 dla KAŻDEGO protokołu, z którego kiedykolwiek wygenerowano
 * zadania pacjenta — a edytor zawsze wysyła komplet kroków, więc używany protokół
 * stawał się nieedytowalny.
 *
 * Krok skasowany w edytorze, ale mający zadania, ZOSTAJE (raport pacjenta musi dalej
 * mieć do czego wskazywać) — zwracamy to jako informację, nie błąd.
 */
async function syncTemplateSteps(templateId: string, steps: StepPayload[]): Promise<SyncResult> {
    const { data: current, error: curErr } = await supabase
        .from('care_template_steps')
        .select('id')
        .eq('template_id', templateId);

    if (curErr) {
        console.error('[CareFlow] Steps read error:', curErr);
        return { error: 'Nie udało się odczytać kroków protokołu', status: 500 };
    }

    const currentIds = new Set<string>((current || []).map((s: { id: string }) => s.id));
    const keptIds = new Set<string>();

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepId = typeof step.id === 'string' && currentIds.has(step.id) ? step.id : null;

        if (stepId) {
            keptIds.add(stepId);
            const { error } = await supabase
                .from('care_template_steps')
                .update(stepColumns(step, i, 'update'))
                .eq('id', stepId)
                .eq('template_id', templateId);

            if (error) {
                console.error('[CareFlow] Step update error:', error);
                return { error: 'Nie udało się zaktualizować kroków protokołu', status: 500 };
            }
        } else {
            const { error } = await supabase
                .from('care_template_steps')
                .insert({ ...stepColumns(step, i, 'insert'), template_id: templateId });

            if (error) {
                console.error('[CareFlow] Step insert error:', error);
                return { error: 'Nie udało się zapisać kroków protokołu', status: 500 };
            }
        }
    }

    const removedIds = [...currentIds].filter((stepId) => !keptIds.has(stepId));
    if (removedIds.length === 0) return { retained: 0 };

    const { data: usedRows, error: usedErr } = await supabase
        .from('care_tasks')
        .select('step_id')
        .in('step_id', removedIds);

    if (usedErr) {
        console.error('[CareFlow] Step usage check error:', usedErr);
        return { error: 'Nie udało się sprawdzić powiązań kroków protokołu', status: 500 };
    }

    const usedIds = new Set<string>((usedRows || []).map((t: { step_id: string }) => t.step_id));
    const deletable = removedIds.filter((stepId) => !usedIds.has(stepId));

    if (deletable.length > 0) {
        const { error: dErr } = await supabase.from('care_template_steps').delete().in('id', deletable);
        if (dErr) {
            // 23503 mimo sprawdzenia = wyścig z równolegle zapisywanym pacjentem.
            // Krok po prostu zostaje — to nie jest powód, żeby wywrócić całą edycję.
            if (dErr.code === '23503') {
                console.warn('[CareFlow] Step delete raced with new tasks:', dErr);
                return { retained: removedIds.length };
            }
            console.error('[CareFlow] Step delete error:', dErr);
            return { error: 'Nie udało się usunąć kroków protokołu', status: 500 };
        }
    }

    return { retained: removedIds.length - deletable.length };
}

/**
 * PUT /api/admin/careflow/templates/[id]
 * Update template and its steps.
 *
 * Semantyka MERGE: pole nieobecne w body zostaje bez zmian (wcześniej `|| []` kasowało
 * procedure_types/default_medications, a `?? true` reaktywowało wyłączony szablon).
 * Kroki synchronizowane są WYŁĄCZNIE gdy body zawiera klucz `steps`.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const { id } = await params;

        const body = await req.json();

        const { data: existing, error: exErr } = await supabase
            .from('care_templates')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (exErr) throw new Error(exErr.message);
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

        // Update template — tylko pola faktycznie przysłane
        const updates: Record<string, unknown> = {};
        if ('name' in body) updates.name = body.name;
        if ('description' in body) updates.description = body.description;
        if ('procedure_types' in body) updates.procedure_types = body.procedure_types;
        if ('default_medications' in body) updates.default_medications = body.default_medications;
        if ('push_settings' in body) updates.push_settings = body.push_settings;
        if ('is_active' in body) updates.is_active = body.is_active;

        if ('name' in body && !updates.name) {
            return NextResponse.json({ error: 'Name required' }, { status: 400, headers: NO_STORE });
        }

        // Sync steps only when the key is present in the body
        let retainedSteps = 0;
        if ('steps' in body) {
            const steps = body.steps as StepPayload[];
            if (!Array.isArray(steps)) {
                return NextResponse.json({ error: 'Pole steps musi być tablicą' }, { status: 400, headers: NO_STORE });
            }

            const invalid = steps.some((s) => !s?.title || typeof s?.offset_hours !== 'number' || Number.isNaN(s.offset_hours));
            if (invalid) {
                return NextResponse.json(
                    { error: 'Każdy krok wymaga tytułu i liczbowego offsetu godzinowego' },
                    { status: 400, headers: NO_STORE }
                );
            }

            const sync = await syncTemplateSteps(id, steps);
            if ('error' in sync) {
                return NextResponse.json({ error: sync.error }, { status: sync.status, headers: NO_STORE });
            }
            retainedSteps = sync.retained;
        }

        // Metadane DOPIERO po udanej synchronizacji kroków — inaczej nieudany zapis kroków
        // zostawiał protokół w połowie zmieniony (nowa nazwa i leki, stare kroki).
        if (Object.keys(updates).length > 0) {
            const { error: tErr } = await supabase
                .from('care_templates')
                .update(updates)
                .eq('id', id);

            if (tErr) throw new Error(tErr.message);
        }

        return NextResponse.json(
            {
                success: true,
                retainedSteps,
                ...(retainedSteps > 0
                    ? {
                        // Uczciwie o granicy rozwiązania: krok z zadaniami zostaje w protokole
                        // i nadal będzie generowany, bo bez FK ON DELETE nie da się go usunąć
                        // bez zerwania historii pacjenta.
                        notice: `Nie usunięto ${retainedSteps} kroków — mają już zadania pacjentów, więc zostają w protokole i nadal będą generowane. Aby je wycofać, utwórz nowy protokół.`,
                    }
                    : {}),
            },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('[CareFlow] PUT template error:', err);
        return NextResponse.json(
            { error: 'Nie udało się zapisać protokołu' },
            { status: 500, headers: NO_STORE }
        );
    }
}

/**
 * DELETE /api/admin/careflow/templates/[id]
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const { id } = await params;

        // Check for active enrollments
        const { count } = await supabase
            .from('care_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('template_id', id)
            .eq('status', 'active');

        if (count && count > 0) {
            return NextResponse.json(
                { error: `Nie można usunąć — ${count} aktywnych procesów` },
                { status: 400, headers: NO_STORE }
            );
        }

        const { error } = await supabase.from('care_templates').delete().eq('id', id);
        if (error) {
            console.error('[CareFlow] DELETE template error:', error);
            // 23503: care_enrollments.template_id ma FK bez ON DELETE — zakończone/anulowane
            // zapisy nadal trzymają protokół. Wcześniej błąd był połykany i UI mówił „usunięto".
            if (error.code === '23503') {
                return NextResponse.json(
                    { error: 'Protokół jest powiązany z historycznymi zapisami pacjentów — zamiast usuwać, oznacz go jako nieaktywny.' },
                    { status: 409, headers: NO_STORE }
                );
            }
            return NextResponse.json(
                { error: 'Nie udało się usunąć protokołu' },
                { status: 500, headers: NO_STORE }
            );
        }

        return NextResponse.json({ success: true }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] DELETE template error:', err);
        return NextResponse.json(
            { error: 'Nie udało się usunąć protokołu' },
            { status: 500, headers: NO_STORE }
        );
    }
}

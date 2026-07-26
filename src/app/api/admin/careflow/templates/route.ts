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

/** Wiersz szablonu z doklejonym agregatem `care_template_steps(count)`. */
type TemplateRow = Record<string, unknown> & {
    care_template_steps?: { count: number }[];
};

/** Krok przysłany przez edytor protokołu. */
type StepPayload = {
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
 * GET /api/admin/careflow/templates
 * List all care templates with step counts.
 *
 * Guard zostaje adminowy — personel czyta listę przez /api/employee/careflow/templates.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        const { data: templates, error } = await supabase
            .from('care_templates')
            .select('*, care_template_steps(count)')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const result = ((templates || []) as TemplateRow[]).map((t) => ({
            ...t,
            step_count: t.care_template_steps?.[0]?.count || 0,
            care_template_steps: undefined,
        }));

        logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'view_careflow_templates', resourceType: 'careflow_template',
            metadata: { count: result.length },
            request: req,
        });

        return NextResponse.json({ templates: result }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] GET templates error:', err);
        return NextResponse.json(
            { error: 'Nie udało się pobrać protokołów' },
            { status: 500, headers: NO_STORE }
        );
    }
}

/**
 * POST /api/admin/careflow/templates
 * Create a new care template.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        const body = await req.json();
        const { name, description, procedure_types, default_medications, push_settings, steps } = body;

        if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400, headers: NO_STORE });

        const stepList: StepPayload[] = Array.isArray(steps) ? steps : [];
        const hasSteps = stepList.length > 0;

        // Walidacja przed INSERT — offset_hours i title są NOT NULL, a błąd bazy
        // i tak nie może wyjść na zewnątrz surowy.
        if (hasSteps) {
            const invalid = stepList.some((s) => !s?.title || typeof s?.offset_hours !== 'number' || Number.isNaN(s.offset_hours));
            if (invalid) {
                return NextResponse.json(
                    { error: 'Każdy krok wymaga tytułu i liczbowego offsetu godzinowego' },
                    { status: 400, headers: NO_STORE }
                );
            }
        }

        // Create template
        const { data: template, error } = await supabase
            .from('care_templates')
            .insert({
                name,
                description: description || '',
                procedure_types: procedure_types || [],
                default_medications: default_medications || [],
                push_settings: push_settings || undefined,
                created_by: user.email,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Create steps if provided
        if (hasSteps) {
            const stepRows = stepList.map((s, i) => ({
                template_id: template.id,
                sort_order: s.sort_order ?? i + 1,
                title: s.title,
                description: s.description || '',
                icon: s.icon || '💊',
                offset_hours: s.offset_hours,
                smart_snap: s.smart_snap ?? true,
                push_message: s.push_message || '',
                is_recurring: s.is_recurring ?? false,
                recurrence_count: s.recurrence_count ?? 0,
                recurrence_interval_hours: s.recurrence_interval_hours ?? 8,
                // Domyślna kadencja nowych protokołów: 3 przypomnienia co 45 min.
                // `??`, nie `||` — jawne 0 (brak przypomnień) musi przetrwać.
                reminder_interval_minutes: s.reminder_interval_minutes ?? 45,
                reminder_max_count: s.reminder_max_count ?? 3,
                requires_confirmation: s.requires_confirmation ?? true,
                medication_index: s.medication_index ?? null,
                visible_hours_before: s.visible_hours_before ?? null,
            }));

            const { error: stepErr } = await supabase
                .from('care_template_steps')
                .insert(stepRows);

            if (stepErr) {
                // Bez kroków szablon jest widmem (0 zadań przy zapisie pacjenta) —
                // wycofujemy świeżo utworzony wiersz i zwracamy błąd HTTP.
                console.error('[CareFlow] Steps insert error:', stepErr);
                const { error: rbErr } = await supabase.from('care_templates').delete().eq('id', template.id);
                if (rbErr) console.error('[CareFlow] Template rollback error:', rbErr);
                return NextResponse.json(
                    { error: 'Nie udało się zapisać kroków protokołu' },
                    { status: 500, headers: NO_STORE }
                );
            }
        }

        return NextResponse.json({ template }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] POST template error:', err);
        return NextResponse.json(
            { error: 'Nie udało się zapisać protokołu' },
            { status: 500, headers: NO_STORE }
        );
    }
}

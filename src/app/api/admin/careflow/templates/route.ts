import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/careflow/templates
 * List all care templates with step counts.
 */
export async function GET() {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: templates, error } = await supabase
            .from('care_templates')
            .select('*, care_template_steps(count)')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const result = (templates || []).map((t: any) => ({
            ...t,
            step_count: t.care_template_steps?.[0]?.count || 0,
            care_template_steps: undefined,
        }));

        return NextResponse.json({ templates: result });
    } catch (err: any) {
        console.error('[CareFlow] GET templates error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/careflow/templates
 * Create a new care template.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, description, procedure_types, default_medications, push_settings, steps } = body;

        if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

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
        if (steps && Array.isArray(steps) && steps.length > 0) {
            const stepRows = steps.map((s: any, i: number) => ({
                template_id: template.id,
                sort_order: s.sort_order ?? i + 1,
                title: s.title,
                description: s.description || '',
                icon: s.icon || '💊',
                offset_hours: s.offset_hours,
                smart_snap: s.smart_snap ?? true,
                push_message: s.push_message || '',
                is_recurring: s.is_recurring || false,
                recurrence_count: s.recurrence_count || 0,
                recurrence_interval_hours: s.recurrence_interval_hours || 8,
                reminder_interval_minutes: s.reminder_interval_minutes || 30,
                reminder_max_count: s.reminder_max_count || 6,
                requires_confirmation: s.requires_confirmation ?? true,
                medication_index: s.medication_index ?? null,
                visible_hours_before: s.visible_hours_before ?? null,
            }));

            const { error: stepErr } = await supabase
                .from('care_template_steps')
                .insert(stepRows);

            if (stepErr) console.error('[CareFlow] Steps insert error:', stepErr);
        }

        return NextResponse.json({ template });
    } catch (err: any) {
        console.error('[CareFlow] POST template error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

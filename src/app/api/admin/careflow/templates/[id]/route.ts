import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/careflow/templates/[id]
 * Get template with all steps.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { id } = await params;

        const { data: template, error } = await supabase
            .from('care_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

        return NextResponse.json({ template: { ...template, steps: steps || [], active_enrollments: count || 0 } });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT /api/admin/careflow/templates/[id]
 * Update template and its steps (full replace).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { id } = await params;

        const body = await req.json();
        const { name, description, procedure_types, default_medications, push_settings, is_active, steps } = body;

        // Update template
        const { error: tErr } = await supabase
            .from('care_templates')
            .update({
                name, description,
                procedure_types: procedure_types || [],
                default_medications: default_medications || [],
                push_settings: push_settings || undefined,
                is_active: is_active ?? true,
            })
            .eq('id', id);

        if (tErr) throw new Error(tErr.message);

        // Replace steps if provided
        if (steps && Array.isArray(steps)) {
            await supabase.from('care_template_steps').delete().eq('template_id', id);

            if (steps.length > 0) {
                const stepRows = steps.map((s: any, i: number) => ({
                    template_id: id,
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

                const { error: sErr } = await supabase.from('care_template_steps').insert(stepRows);
                if (sErr) console.error('[CareFlow] Steps replace error:', sErr);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/careflow/templates/[id]
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { id } = await params;

        // Check for active enrollments
        const { count } = await supabase
            .from('care_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('template_id', id)
            .eq('status', 'active');

        if (count && count > 0) {
            return NextResponse.json({ error: `Nie można usunąć — ${count} aktywnych procesów` }, { status: 400 });
        }

        await supabase.from('care_templates').delete().eq('id', id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

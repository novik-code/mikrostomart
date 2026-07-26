import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/tasks/labels
 * Returns all available labels.
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .order('name');

    if (error) {
        console.error('[TaskLabels] Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ labels: data || [] });
}

/**
 * POST /api/employee/tasks/labels
 * Body: { name: string, color: string }
 * Creates a new label.
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return NextResponse.json({ error: 'Tylko admin może tworzyć etykiety' }, { status: 403 });

    try {
        const body = await req.json();
        if (!body.name?.trim()) {
            return NextResponse.json({ error: 'Name required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('task_labels')
            .insert({
                name: body.name.trim(),
                color: body.color || '#38bdf8',
            })
            .select()
            .single();

        if (error) {
            console.error('[TaskLabels] Insert error:', error);
            return NextResponse.json({ error: 'Failed' }, { status: 500 });
        }

        return NextResponse.json({ label: data }, { status: 201 });
    } catch (err: any) {
        console.error('[TaskLabels] Error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * PUT /api/employee/tasks/labels
 * Body: { id: string, name?: string, color?: string } — zmiana nazwy / koloru etykiety.
 * Tylko admin (jak tworzenie).
 */
export async function PUT(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return NextResponse.json({ error: 'Tylko admin może zmieniać etykiety' }, { status: 403 });

    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const updates: Record<string, unknown> = {};
        if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
        if (typeof body.color === 'string' && body.color.trim()) updates.color = body.color.trim();
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('task_labels')
            .update(updates)
            .eq('id', body.id)
            .select()
            .single();

        if (error) {
            console.error('[TaskLabels] Update error:', error);
            return NextResponse.json({ error: 'Failed' }, { status: 500 });
        }

        return NextResponse.json({ label: data });
    } catch (err) {
        console.error('[TaskLabels] PUT error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/employee/tasks/labels
 * Body: { id: string }
 * 🔑 Kasuje etykietę ORAZ zdejmuje ją ze wszystkich zadań (`employee_tasks.label_ids`, mig 180) —
 * inaczej w zadaniach zostałyby wiszące identyfikatory bez odpowiednika w słowniku.
 * Tylko admin.
 */
export async function DELETE(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return NextResponse.json({ error: 'Tylko admin może usuwać etykiety' }, { status: 403 });

    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        // Najpierw odpięcie od zadań — jeśli padnie, etykieta zostaje i można ponowić.
        const { data: tagged, error: readErr } = await supabase
            .from('employee_tasks')
            .select('id, label_ids')
            .contains('label_ids', [body.id]);

        if (readErr) {
            console.error('[TaskLabels] Read tagged error:', readErr);
            return NextResponse.json({ error: 'Failed' }, { status: 500 });
        }

        for (const row of tagged || []) {
            const next = (row.label_ids || []).filter((x: string) => x !== body.id);
            const { error: upErr } = await supabase
                .from('employee_tasks')
                .update({ label_ids: next })
                .eq('id', row.id);
            if (upErr) {
                console.error('[TaskLabels] Detach error:', upErr);
                return NextResponse.json({ error: 'Failed' }, { status: 500 });
            }
        }

        const { error } = await supabase.from('task_labels').delete().eq('id', body.id);
        if (error) {
            console.error('[TaskLabels] Delete error:', error);
            return NextResponse.json({ error: 'Failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, detached: (tagged || []).length });
    } catch (err) {
        console.error('[TaskLabels] DELETE error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

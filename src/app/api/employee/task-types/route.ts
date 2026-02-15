import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyEmployeeOrAdmin() {
    const user = await verifyAdmin();
    if (!user) return null;
    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return null;
    return user;
}

/**
 * GET /api/employee/task-types
 * Returns all active task type templates ordered by sort_order.
 */
export async function GET() {
    const user = await verifyEmployeeOrAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('task_type_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[TaskTypes] GET error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ templates: data || [] });
}

/**
 * POST /api/employee/task-types
 * Create a new task type template.
 * Body: { label, icon?, items[] }
 */
export async function POST(request: Request) {
    const user = await verifyEmployeeOrAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { label, icon, items } = body;

    if (!label || typeof label !== 'string') {
        return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    // Generate key from label
    const key = label
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[łŁ]/g, 'l')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

    // Get max sort_order
    const { data: maxRow } = await supabase
        .from('task_type_templates')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxRow?.sort_order || 0) + 1;

    const { data, error } = await supabase
        .from('task_type_templates')
        .insert({
            key,
            label,
            icon: icon || '📋',
            items: items || [],
            sort_order: nextOrder,
        })
        .select()
        .single();

    if (error) {
        console.error('[TaskTypes] POST error:', error);
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Typ o tej nazwie już istnieje' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ template: data }, { status: 201 });
}

/**
 * PUT /api/employee/task-types
 * Update an existing template.
 * Body: { id, label?, icon?, items?, sort_order? }
 */
export async function PUT(request: Request) {
    const user = await verifyEmployeeOrAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
    }

    // Only allow updating specific fields
    const allowed: Record<string, unknown> = {};
    if (updates.label !== undefined) allowed.label = updates.label;
    if (updates.icon !== undefined) allowed.icon = updates.icon;
    if (updates.items !== undefined) allowed.items = updates.items;
    if (updates.sort_order !== undefined) allowed.sort_order = updates.sort_order;

    if (Object.keys(allowed).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('task_type_templates')
        .update(allowed)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[TaskTypes] PUT error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ template: data });
}

/**
 * DELETE /api/employee/task-types
 * Soft-delete a template (set is_active = false).
 * Body: { id }
 */
export async function DELETE(request: Request) {
    const user = await verifyEmployeeOrAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
        return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
    }

    const { error } = await supabase
        .from('task_type_templates')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        console.error('[TaskTypes] DELETE error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

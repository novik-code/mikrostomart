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

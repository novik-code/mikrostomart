import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { sendPushToGroups, type PushGroup } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/push
 * List all push subscriptions with user info
 */
export async function GET() {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('id, user_type, user_id, employee_group, locale, created_at, endpoint')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Admin/Push] GET error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    // Enrich with email/name from employees table for employee subs
    const employeeUserIds = (subs || [])
        .filter(s => s.user_type === 'employee')
        .map(s => s.user_id);

    let employeeMap: Record<string, { email: string; name: string }> = {};
    if (employeeUserIds.length > 0) {
        const { data: employees } = await supabase
            .from('employees')
            .select('user_id, email, name')
            .in('user_id', employeeUserIds);
        for (const emp of employees || []) {
            employeeMap[emp.user_id] = { email: emp.email, name: emp.name };
        }
    }

    // Stats
    const stats = {
        total: subs?.length || 0,
        patients: subs?.filter(s => s.user_type === 'patient').length || 0,
        doctors: subs?.filter(s => s.employee_group === 'doctor').length || 0,
        hygienists: subs?.filter(s => s.employee_group === 'hygienist').length || 0,
        reception: subs?.filter(s => s.employee_group === 'reception').length || 0,
        assistant: subs?.filter(s => s.employee_group === 'assistant').length || 0,
        admin: subs?.filter(s => s.user_type === 'admin').length || 0,
        unassigned: subs?.filter(s => s.user_type === 'employee' && !s.employee_group).length || 0,
    };

    const enriched = (subs || []).map(s => ({
        ...s,
        endpoint: s.endpoint.substring(0, 50) + '...', // truncate for display
        employeeName: employeeMap[s.user_id]?.name || null,
        employeeEmail: employeeMap[s.user_id]?.email || null,
    }));

    return NextResponse.json({ subscriptions: enriched, stats });
}

/**
 * POST /api/admin/push
 * Send push notification to specified groups
 * Body: { title, body, url?, groups: PushGroup[] }
 */
export async function POST(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { title, body, url, groups } = await request.json();

        if (!title || !body || !Array.isArray(groups) || groups.length === 0) {
            return NextResponse.json({ error: 'title, body, and at least one group are required' }, { status: 400 });
        }

        const validGroups: PushGroup[] = ['patients', 'doctors', 'hygienists', 'reception', 'assistant', 'admin'];
        const filteredGroups = groups.filter((g: string) => validGroups.includes(g as PushGroup)) as PushGroup[];

        if (filteredGroups.length === 0) {
            return NextResponse.json({ error: 'No valid groups specified' }, { status: 400 });
        }

        console.log(`[Admin/Push] Sending to groups: ${filteredGroups.join(', ')} by ${adminUser.email}`);

        const result = await sendPushToGroups(filteredGroups, {
            title,
            body,
            url: url || '/pracownik',
            tag: `admin-broadcast-${Date.now()}`,
        });

        console.log(`[Admin/Push] Result:`, result);

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('[Admin/Push] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/push
 * Remove a push subscription by ID
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Admin/Push] DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

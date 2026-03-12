import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { sendPushToGroups, sendPushToSpecificUsers, type PushGroup } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/push
 * Returns:
 *   - employees: all employees with their push_groups and subscription count
 *   - patientSubsCount: how many patient subscriptions exist
 *   - adminSubs: admin subscriptions list
 *   - stats: group-level counts
 */
export async function GET() {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Fetch ALL active employees
    const { data: allEmployees } = await supabase
        .from('employees')
        .select('user_id, name, email, position, push_groups')
        .eq('is_active', true)
        .order('name', { ascending: true });

    // 2. Fetch ALL push subscriptions
    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('id, user_type, user_id, employee_group, employee_groups, locale, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Admin/Push] GET error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    // 3. Count subscriptions per user
    const subCountPerUser: Record<string, number> = {};
    for (const s of subs || []) {
        subCountPerUser[s.user_id] = (subCountPerUser[s.user_id] || 0) + 1;
    }

    // 4. Build employees response — every employee, with groups and sub count
    const employees = (allEmployees || []).map(emp => ({
        user_id: emp.user_id,
        name: emp.name,
        email: emp.email,
        position: emp.position,
        push_groups: emp.push_groups || [],
        subscription_count: subCountPerUser[emp.user_id] || 0,
    }));

    // 5. Admin subscriptions
    const adminSubs = (subs || [])
        .filter(s => s.user_type === 'admin')
        .map(s => ({ ...s }));

    // 6. Patient sub count
    const patientSubsCount = (subs || []).filter(s => s.user_type === 'patient').length;

    // 7. Stats
    const employeeSubs = (subs || []).filter(s => s.user_type === 'employee');
    const stats = {
        total: subs?.length || 0,
        patients: patientSubsCount,
        doctors: employeeSubs.filter(s =>
            (s.employee_groups || []).includes('doctor') || s.employee_group === 'doctor').length,
        hygienists: employeeSubs.filter(s =>
            (s.employee_groups || []).includes('hygienist') || s.employee_group === 'hygienist').length,
        reception: employeeSubs.filter(s =>
            (s.employee_groups || []).includes('reception') || s.employee_group === 'reception').length,
        assistant: employeeSubs.filter(s =>
            (s.employee_groups || []).includes('assistant') || s.employee_group === 'assistant').length,
        admin: adminSubs.length,
        unassigned: employeeSubs.filter(s =>
            !s.employee_group && (!s.employee_groups || s.employee_groups.length === 0)).length,
    };

    return NextResponse.json({ employees, adminSubs, patientSubsCount, stats });
}


/**
 * POST /api/admin/push
 * Send push notification to specified groups and/or individual users.
 * Body: { title, body, url?, groups?: PushGroup[], userIds?: string[] }
 * At least one of groups or userIds must be non-empty.
 */
export async function POST(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { title, body, url, groups, userIds } = await request.json();

        if (!title || !body) {
            return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
        }

        const hasGroups = Array.isArray(groups) && groups.length > 0;
        const hasUsers = Array.isArray(userIds) && userIds.length > 0;

        if (!hasGroups && !hasUsers) {
            return NextResponse.json({ error: 'Specify at least one group or user' }, { status: 400 });
        }

        const payload = {
            title,
            body,
            url: url || '/pracownik',
            tag: `admin-broadcast-${Date.now()}`,
        };

        let totalSent = 0;
        let totalFailed = 0;
        const byGroup: Record<string, { sent: number; failed: number }> = {};

        // Send to groups
        if (hasGroups) {
            const validGroups: PushGroup[] = ['patients', 'doctors', 'hygienists', 'reception', 'assistant', 'admin'];
            const filteredGroups = (groups as string[]).filter(g => validGroups.includes(g as PushGroup)) as PushGroup[];

            if (filteredGroups.length > 0) {
                console.log(`[Admin/Push] Sending to groups: ${filteredGroups.join(', ')} by ${adminUser.email}`);
                const result = await sendPushToGroups(filteredGroups, payload);
                totalSent += result.sent;
                totalFailed += result.failed;
                Object.assign(byGroup, result.byGroup);
            }
        }

        // Send to individual users
        if (hasUsers) {
            console.log(`[Admin/Push] Sending to ${userIds.length} individual users by ${adminUser.email}`);
            const result = await sendPushToSpecificUsers(userIds, payload);
            totalSent += result.sent;
            totalFailed += result.failed;
            byGroup['individuals'] = result;
        }

        console.log(`[Admin/Push] Result: sent=${totalSent} failed=${totalFailed}`);
        return NextResponse.json({ success: true, sent: totalSent, failed: totalFailed, byGroup });
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

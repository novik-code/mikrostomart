import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { pushToGroups, pushToUsers, type PushGroup } from '@/lib/pushService';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/push
 * Returns:
 *   - employees: all employees with subscription count (from fcm_tokens)
 *   - patientSubsCount: how many patient tokens exist
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

    // 2. Fetch ALL FCM tokens
    const { data: tokens, error } = await supabase
        .from('fcm_tokens')
        .select('id, user_type, user_id, device_label, last_active_at, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Admin/Push] GET error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    // 3. Count tokens per user
    const tokenCountPerUser: Record<string, number> = {};
    for (const t of tokens || []) {
        tokenCountPerUser[t.user_id] = (tokenCountPerUser[t.user_id] || 0) + 1;
    }

    // 4. Build employees response
    const employees = (allEmployees || []).map(emp => ({
        user_id: emp.user_id,
        name: emp.name,
        email: emp.email,
        position: emp.position,
        push_groups: emp.push_groups || [],
        subscription_count: tokenCountPerUser[emp.user_id] || 0,
    }));

    // 5. Admin tokens
    const adminSubs = (tokens || [])
        .filter(t => t.user_type === 'admin')
        .map(t => ({ ...t }));

    // 6. Patient token count
    const patientSubsCount = (tokens || []).filter(t => t.user_type === 'patient').length;

    // 7. Stats — based on employee push_groups from employees table
    const empGroupCounts: Record<string, number> = { doctors: 0, hygienists: 0, reception: 0, assistant: 0, unassigned: 0 };
    for (const emp of allEmployees || []) {
        if (!emp.user_id || !tokenCountPerUser[emp.user_id]) continue; // only count those with tokens
        const groups = emp.push_groups || [];
        if (groups.length === 0) {
            empGroupCounts.unassigned++;
        } else {
            if (groups.includes('doctor')) empGroupCounts.doctors++;
            if (groups.includes('hygienist')) empGroupCounts.hygienists++;
            if (groups.includes('reception')) empGroupCounts.reception++;
            if (groups.includes('assistant')) empGroupCounts.assistant++;
        }
    }

    const stats = {
        total: tokens?.length || 0,
        patients: patientSubsCount,
        ...empGroupCounts,
        admin: adminSubs.length,
    };

    return NextResponse.json({ employees, adminSubs, patientSubsCount, stats });
}


/**
 * POST /api/admin/push
 * Send push notification to specified groups and/or individual users.
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
                const result = await pushToGroups(filteredGroups, payload);
                totalSent += result.sent;
                totalFailed += result.failed;
                Object.assign(byGroup, result.byGroup);
            }
        }

        // Send to individual users
        if (hasUsers) {
            console.log(`[Admin/Push] Sending to ${userIds.length} individual users by ${adminUser.email}`);
            const result = await pushToUsers(userIds, payload);
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
 * Remove an FCM token by ID.
 */
export async function DELETE(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const { error } = await supabase
            .from('fcm_tokens')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Admin/Push] DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

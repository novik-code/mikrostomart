import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/notification-preferences
 *
 * Returns:
 *   - muted_keys:  string[] of config keys the user has muted
 *   - configs:     all push_notification_config rows available to this user
 *                  (filtered by user's push_groups; admins see everything)
 */
export async function GET(_req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    // 1. Get user's muted keys
    const { data: prefs } = await supabase
        .from('employee_notification_preferences')
        .select('muted_keys')
        .eq('user_id', user.id)
        .single();

    const mutedKeys: string[] = prefs?.muted_keys || [];

    // 2. Get all push configs (employee-targeted)
    const { data: allConfigs } = await supabase
        .from('push_notification_config')
        .select('key, label, description, groups, recipient_types, enabled')
        .order('key');

    // 3. Filter configs: only show employee-targeted ones
    let configs = (allConfigs || []).filter(c =>
        !c.recipient_types || c.recipient_types.includes('employees')
    );

    // 4. For non-admin users, further filter to configs targeting their groups
    if (!isAdmin) {
        // Get user's push groups
        const { data: emp } = await supabase
            .from('employees')
            .select('push_groups, position')
            .eq('user_id', user.id)
            .single();

        const userGroups: string[] = emp?.push_groups || [];

        // Map db group keys (doctor, hygienist...) to config group keys (doctors, hygienists...)
        const groupMapping: Record<string, string> = {
            doctor: 'doctors',
            hygienist: 'hygienists',
            reception: 'reception',
            assistant: 'assistant',
        };
        const configGroupKeys = userGroups.map(g => groupMapping[g] || g);

        configs = configs.filter(c => {
            const targetGroups: string[] = c.groups || [];
            // If config has no groups specified → visible to all
            if (targetGroups.length === 0) return true;
            // Show if any of user's groups matches config's target groups
            return configGroupKeys.some(ug => targetGroups.includes(ug));
        });
    }

    return NextResponse.json({ mutedKeys, configs });
}

/**
 * PATCH /api/employee/notification-preferences
 * Body: { mutedKeys: string[] }
 *
 * Upserts the user's muted notification keys.
 */
export async function PATCH(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    try {
        const { mutedKeys } = await req.json();

        if (!Array.isArray(mutedKeys)) {
            return NextResponse.json({ error: 'mutedKeys must be an array' }, { status: 400 });
        }

        const { error } = await supabase
            .from('employee_notification_preferences')
            .upsert(
                {
                    user_id: user.id,
                    muted_keys: mutedKeys,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            );

        if (error) throw error;

        console.log(`[NotifPrefs] Updated for ${user.email}: muted=${mutedKeys.length} keys`);
        return NextResponse.json({ success: true, mutedKeys });
    } catch (error: any) {
        console.error('[NotifPrefs] PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Valid push group keys
 */
const VALID_GROUPS = ['doctor', 'hygienist', 'reception', 'assistant'];

/**
 * PATCH /api/admin/employees/position
 * Update an employee's push groups (multi-group support).
 * Body: { userId: string, groups: string[] }  — groups are DB-level keys (doctor/hygienist/reception/assistant)
 *
 * Also accepts legacy { userId, position } for backward compat (converts to groups[]).
 */
export async function PATCH(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        let groups: string[] = [];

        if (Array.isArray(body.groups)) {
            // New: array of group keys ('doctor', 'hygienist', 'reception', 'assistant')
            groups = body.groups.filter((g: string) => VALID_GROUPS.includes(g));
        } else if (body.position !== undefined) {
            // Legacy: single position string → convert
            const pos = (body.position || '').toLowerCase();
            if (pos.includes('lekarz') || pos.includes('doktor')) groups = ['doctor'];
            else if (pos.includes('higienist')) groups = ['hygienist'];
            else if (pos.includes('recepcj')) groups = ['reception'];
            else if (pos.includes('asystent')) groups = ['assistant'];
        }

        // Update employees table: push_groups array
        await supabase
            .from('employees')
            .update({
                push_groups: groups.length > 0 ? groups : null,
            })
            .eq('user_id', userId);

        // Sync to all push_subscriptions for this user
        const updatePayload: Record<string, any> = {
            employee_groups: groups.length > 0 ? groups : null,
            // Keep single employee_group for backward-compat (first element)
            employee_group: groups.length > 0 ? groups[0] : null,
        };

        await supabase
            .from('push_subscriptions')
            .update(updatePayload)
            .eq('user_id', userId)
            .eq('user_type', 'employee');

        console.log(`[Admin/EmployeePosition] Set groups for ${userId}:`, groups);
        return NextResponse.json({ success: true, groups });
    } catch (error: any) {
        console.error('[Admin/EmployeePosition] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

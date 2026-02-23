import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POSITION_TO_GROUP: Record<string, string> = {
    lekarz: 'doctor',
    doktor: 'doctor',
    higienistka: 'hygienist',
    higienist: 'hygienist',
    recepcja: 'reception',
    recepcjonistka: 'reception',
    asysta: 'assistant',
    asystentka: 'assistant',
};

function positionToGroup(position: string | null | undefined): string | null {
    if (!position) return null;
    const lower = position.toLowerCase();
    for (const [key, group] of Object.entries(POSITION_TO_GROUP)) {
        if (lower.includes(key)) return group;
    }
    return null;
}

/**
 * PATCH /api/admin/employees/position
 * Updates the employee's position (sub-group) and syncs push_subscriptions.employee_group.
 * Body: { userId: string, position: string }
 */
export async function PATCH(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userId, position } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const employee_group = positionToGroup(position);

        // Update employees.position
        const { error: empError } = await supabase
            .from('employees')
            .update({ position: position || null, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

        if (empError) {
            console.error('[Position] employees update error:', empError);
            return NextResponse.json({ error: 'Failed to update position' }, { status: 500 });
        }

        // Sync to push_subscriptions
        const { error: pushError } = await supabase
            .from('push_subscriptions')
            .update({ employee_group })
            .eq('user_id', userId)
            .eq('user_type', 'employee');

        if (pushError) {
            console.error('[Position] push_subscriptions sync error:', pushError);
            // Non-fatal — position was updated, subscriptions will re-sync next subscribe
        }

        console.log(`[Position] Updated ${userId} → position: ${position}, group: ${employee_group}`);

        return NextResponse.json({ success: true, position, employee_group });
    } catch (error: any) {
        console.error('[Position] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

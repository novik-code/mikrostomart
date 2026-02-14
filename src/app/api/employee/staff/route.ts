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
 * GET /api/employee/staff
 * Returns only registered employees from user_roles table (not Prodentis scan).
 * Fast, lightweight, returns current system users with 'employee' or 'admin' role.
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Get all users with 'employee' or 'admin' role
        const { data: roles, error } = await supabase
            .from('user_roles')
            .select('user_id, email, role, granted_at, display_name')
            .in('role', ['employee', 'admin'])
            .order('email', { ascending: true });

        if (error) {
            console.error('[Staff] Supabase error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Deduplicate by user_id (a user can have both 'employee' and 'admin' roles)
        const userMap = new Map<string, { id: string; email: string; displayName: string | null; roles: string[] }>();
        for (const r of (roles || [])) {
            const existing = userMap.get(r.user_id);
            if (existing) {
                existing.roles.push(r.role);
                // Keep the display_name if we find one
                if (r.display_name && !existing.displayName) {
                    existing.displayName = r.display_name;
                }
            } else {
                userMap.set(r.user_id, {
                    id: r.user_id,
                    email: r.email,
                    displayName: r.display_name || null,
                    roles: [r.role],
                });
            }
        }

        const staff = Array.from(userMap.values()).map(u => ({
            id: u.id,
            name: u.displayName || u.email,
            email: u.email,
            roles: u.roles,
        }));

        return NextResponse.json({ staff });
    } catch (error) {
        console.error('[Staff] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

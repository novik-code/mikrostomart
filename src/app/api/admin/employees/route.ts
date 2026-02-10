import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/employees
 * Returns current employees — users who have the 'employee' role in user_roles.
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch all users with 'employee' role
        const { data: employeeRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, email, granted_at, granted_by')
            .eq('role', 'employee')
            .order('granted_at', { ascending: false });

        if (rolesError) {
            console.error('[Employees] Error fetching employee roles:', rolesError);
            return NextResponse.json({ error: 'Błąd pobierania danych' }, { status: 500 });
        }

        // Fetch auth users to get additional info
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authMap = new Map<string, { created_at: string; last_sign_in_at: string | null }>();
        if (authUsers?.users) {
            for (const au of authUsers.users) {
                authMap.set(au.id, {
                    created_at: au.created_at,
                    last_sign_in_at: au.last_sign_in_at || null,
                });
            }
        }

        // Also check which employees have 'admin' role
        const { data: adminRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');
        const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));

        const employees = (employeeRoles || []).map(er => {
            const authInfo = authMap.get(er.user_id);
            return {
                userId: er.user_id,
                email: er.email,
                grantedAt: er.granted_at,
                grantedBy: er.granted_by,
                isAlsoAdmin: adminUserIds.has(er.user_id),
                lastSignIn: authInfo?.last_sign_in_at || null,
                createdAt: authInfo?.created_at || null,
            };
        });

        return NextResponse.json({ employees });
    } catch (error) {
        console.error('[Employees] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

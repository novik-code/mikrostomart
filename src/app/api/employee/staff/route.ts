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
 * Returns ALL active employees — merges user_roles (registered accounts)
 * with the employees table (all active team members, including those without accounts).
 * Used for task assignment dropdowns and filter dropdowns in Zadania tab.
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
        // Source 1: users with 'employee' or 'admin' role (registered accounts)
        const { data: roles, error } = await supabase
            .from('user_roles')
            .select('user_id, email, role, granted_at')
            .in('role', ['employee', 'admin'])
            .order('email', { ascending: true });

        if (error) {
            console.error('[Staff] Supabase error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Source 2: ALL active employees from employees table
        const { data: employeesData } = await supabase
            .from('employees')
            .select('id, email, name')
            .eq('is_active', true);

        const employeesList = employeesData || [];
        const nameMap = new Map(employeesList.map(e => [e.email, e.name]));

        // Build map from user_roles (deduplicate by user_id)
        const staffByEmail = new Map<string, { id: string; email: string; name: string; roles: string[] }>();
        for (const r of (roles || [])) {
            const existing = staffByEmail.get(r.email);
            if (existing) {
                if (!existing.roles.includes(r.role)) existing.roles.push(r.role);
            } else {
                const realName = nameMap.get(r.email);
                staffByEmail.set(r.email, {
                    id: r.user_id,
                    email: r.email,
                    name: realName && realName !== r.email ? realName : r.email,
                    roles: [r.role],
                });
            }
        }

        // Merge employees from employees table who are NOT already in staffByEmail
        for (const emp of employeesList) {
            if (emp.email && !staffByEmail.has(emp.email)) {
                staffByEmail.set(emp.email, {
                    id: `emp-${emp.id}`,  // Prefix to distinguish from auth user IDs
                    email: emp.email,
                    name: emp.name && emp.name !== emp.email ? emp.name : emp.email,
                    roles: [],
                });
            }
            // Also add employees without email but with a name (manual entries)
            if (!emp.email && emp.name) {
                const key = `emp-name-${emp.id}`;
                if (!staffByEmail.has(key)) {
                    staffByEmail.set(key, {
                        id: `emp-${emp.id}`,
                        email: '',
                        name: emp.name,
                        roles: [],
                    });
                }
            }
        }

        const staff = Array.from(staffByEmail.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
            .map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                roles: u.roles,
            }));

        return NextResponse.json({ staff });
    } catch (error) {
        console.error('[Staff] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}


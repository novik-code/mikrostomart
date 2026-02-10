import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getAllUsersWithRoles, grantRole, revokeRole, type UserRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/roles
 * List all users with their roles (admin only)
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const usersWithRoles = await getAllUsersWithRoles();

        // Also fetch all Supabase auth users to show users without any roles
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('[Admin/Roles] Error listing auth users:', authError);
        }

        // Merge: include auth users that don't have any roles yet
        const existingUserIds = new Set(usersWithRoles.map(u => u.user_id));
        const allUsers = [...usersWithRoles];

        if (authUsers?.users) {
            for (const authUser of authUsers.users) {
                if (!existingUserIds.has(authUser.id)) {
                    allUsers.push({
                        user_id: authUser.id,
                        email: authUser.email || '',
                        roles: [],
                        roleDetails: [],
                    });
                }
            }
        }

        // Sort by email
        allUsers.sort((a, b) => a.email.localeCompare(b.email));

        return NextResponse.json({ users: allUsers });
    } catch (error) {
        console.error('[Admin/Roles] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/roles
 * Grant a role to a user
 * Body: { userId: string, email: string, role: 'admin' | 'employee' | 'patient' }
 */
export async function POST(request: Request) {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userId, email, role } = await request.json();

        if (!userId || !email || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const validRoles: UserRole[] = ['admin', 'employee', 'patient'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const success = await grantRole(userId, email, role, adminUser.email || 'admin');

        if (!success) {
            return NextResponse.json({ error: 'Failed to grant role' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Role ${role} granted to ${email}` });
    } catch (error) {
        console.error('[Admin/Roles] POST error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/roles
 * Revoke a role from a user
 * Body: { userId: string, role: 'admin' | 'employee' | 'patient' }
 */
export async function DELETE(request: Request) {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userId, role } = await request.json();

        if (!userId || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const validRoles: UserRole[] = ['admin', 'employee', 'patient'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Prevent revoking own admin role
        if (userId === adminUser.id && role === 'admin') {
            return NextResponse.json(
                { error: 'Nie możesz odebrać sobie roli administratora' },
                { status: 400 }
            );
        }

        const success = await revokeRole(userId, role);

        if (!success) {
            return NextResponse.json({ error: 'Failed to revoke role' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Role ${role} revoked` });
    } catch (error) {
        console.error('[Admin/Roles] DELETE error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

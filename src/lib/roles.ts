import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type UserRole = 'admin' | 'employee' | 'patient';

/**
 * Get all roles for a user by their Supabase auth user ID
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

    if (error) {
        console.error('[Roles] Error fetching roles:', error);
        return [];
    }

    return (data || []).map(r => r.role as UserRole);
}

/**
 * Get all roles for a user by their email
 */
export async function getUserRolesByEmail(email: string): Promise<UserRole[]> {
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', email);

    if (error) {
        console.error('[Roles] Error fetching roles by email:', error);
        return [];
    }

    return (data || []).map(r => r.role as UserRole);
}

/**
 * Check if a user has a specific role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

    if (error) return false;
    return !!data;
}

/**
 * Grant a role to a user
 */
export async function grantRole(userId: string, email: string, role: UserRole, grantedBy: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_roles')
        .insert({
            user_id: userId,
            email,
            role,
            granted_by: grantedBy,
        });

    if (error) {
        if (error.code === '23505') {
            // Unique constraint violation — role already exists
            console.log(`[Roles] User ${email} already has role ${role}`);
            return true;
        }
        console.error('[Roles] Error granting role:', error);
        return false;
    }

    console.log(`[Roles] Granted ${role} to ${email} by ${grantedBy}`);
    return true;
}

/**
 * Revoke a role from a user
 */
export async function revokeRole(userId: string, role: UserRole): Promise<boolean> {
    const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

    if (error) {
        console.error('[Roles] Error revoking role:', error);
        return false;
    }

    console.log(`[Roles] Revoked ${role} from user ${userId}`);
    return true;
}

/**
 * Get all users with their roles (for admin panel)
 */
export async function getAllUsersWithRoles(): Promise<Array<{
    user_id: string;
    email: string;
    roles: UserRole[];
    roleDetails: Array<{ role: UserRole; granted_by: string | null; granted_at: string }>;
}>> {
    const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('email', { ascending: true });

    if (error) {
        console.error('[Roles] Error fetching all roles:', error);
        return [];
    }

    // Group by user
    const userMap = new Map<string, {
        user_id: string;
        email: string;
        roles: UserRole[];
        roleDetails: Array<{ role: UserRole; granted_by: string | null; granted_at: string }>;
    }>();

    for (const row of data || []) {
        const existing = userMap.get(row.user_id);
        if (existing) {
            existing.roles.push(row.role as UserRole);
            existing.roleDetails.push({
                role: row.role as UserRole,
                granted_by: row.granted_by,
                granted_at: row.granted_at,
            });
        } else {
            userMap.set(row.user_id, {
                user_id: row.user_id,
                email: row.email,
                roles: [row.role as UserRole],
                roleDetails: [{
                    role: row.role as UserRole,
                    granted_by: row.granted_by,
                    granted_at: row.granted_at,
                }],
            });
        }
    }

    return Array.from(userMap.values());
}

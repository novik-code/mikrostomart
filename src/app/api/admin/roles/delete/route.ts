import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/roles/delete
 * Delete a Supabase Auth user (and their roles) permanently.
 * Body: { userId: string }
 */
export async function POST(request: Request) {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Prevent deleting yourself
        if (userId === adminUser.id) {
            return NextResponse.json({ error: 'Nie można usunąć własnego konta' }, { status: 400 });
        }

        // First, clean up any user_roles entries
        const { error: rolesError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId);

        if (rolesError) {
            console.error('[Delete User] Error cleaning up roles:', rolesError);
            // Continue anyway — the auth user deletion is more important
        }

        // Delete the Supabase Auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error('[Delete User] Error deleting auth user:', deleteError);
            return NextResponse.json({ error: `Nie udało się usunąć użytkownika: ${deleteError.message}` }, { status: 500 });
        }

        console.log(`[Delete User] Successfully deleted user ${userId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Delete User] Error:', error);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
    }
}

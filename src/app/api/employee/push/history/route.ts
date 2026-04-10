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
 * GET /api/employee/push/history
 *
 * Returns the last 7 days of push notifications for the logged-in employee,
 * ordered newest first. Used by the "Powiadomienia" tab in the employee panel.
 */
export async function GET(_req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    // Debug: check what user_id we're querying with
    console.log(`[PushHistory] Querying for user_id="${user.id}" (email: ${user.email})`);

    const { data, error } = await supabase
        .from('push_notifications_log')
        .select('id, title, body, url, tag, sent_at')
        .eq('user_id', user.id)
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('[PushHistory] Query error:', error);
        return NextResponse.json({ error: 'Błąd pobierania historii' }, { status: 500 });
    }

    // Debug: check total count in table regardless of user filter
    const { count } = await supabase
        .from('push_notifications_log')
        .select('*', { count: 'exact', head: true });
    console.log(`[PushHistory] Found ${data?.length || 0} rows for user, ${count} total rows in table`);

    return NextResponse.json({ notifications: data || [] });
}

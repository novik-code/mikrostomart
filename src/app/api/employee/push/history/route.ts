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
 * Returns ALL system notifications from the last 30 days,
 * deduplicated so each unique event shows once.
 * Every employee/admin sees the full notification history.
 */
export async function GET(_req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    // Fetch all notifications (not filtered by user), then deduplicate
    const { data, error } = await supabase
        .from('push_notifications_log')
        .select('id, title, body, url, tag, sent_at, user_type')
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(1000);

    if (error) {
        console.error('[PushHistory] Query error:', error);
        return NextResponse.json({ error: 'Błąd pobierania historii' }, { status: 500 });
    }

    // Deduplicate: same title+body within 2 seconds = same event sent to multiple users
    const seen = new Set<string>();
    const unique = (data || []).filter(row => {
        const ts = Math.floor(new Date(row.sent_at).getTime() / 2000); // 2-second window
        const key = `${row.title}|${row.body}|${ts}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return NextResponse.json({ notifications: unique.slice(0, 200) });
}

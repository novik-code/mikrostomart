import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/cron/push-cleanup
 *
 * Deletes push notification log entries older than 7 days.
 * Called by Vercel Cron daily at 03:00 UTC.
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error, count } = await supabase
        .from('push_notifications_log')
        .delete({ count: 'exact' })
        .lt('sent_at', cutoff);

    if (error) {
        console.error('[PushCleanup] Error:', error);
        return NextResponse.json({ error: 'Cleanup failed', detail: error.message }, { status: 500 });
    }

    console.log(`[PushCleanup] Deleted ${count} notifications older than ${cutoff}`);
    return NextResponse.json({ deleted: count });
}

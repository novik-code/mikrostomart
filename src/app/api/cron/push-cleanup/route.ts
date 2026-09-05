import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

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
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔑 Bez uderzenia serca rejestr zdrowia nie odróżnia „cron zadziałał i nie miał co robić"
    // od „cron nie ruszył". Ten chodził od marca i przez pół roku raportował się jako MILCZĄCY.
    const t0 = Date.now();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error, count } = await supabase
        .from('push_notifications_log')
        .delete({ count: 'exact' })
        .lt('sent_at', cutoff);

    if (error) {
        console.error('[PushCleanup] Error:', error);
        await logCronHeartbeat('push-cleanup', 'error', error.message?.slice(0, 200), Date.now() - t0);
        return NextResponse.json({ error: 'Cleanup failed', detail: error.message }, { status: 500 });
    }

    console.log(`[PushCleanup] Deleted ${count} notifications older than ${cutoff}`);
    await logCronHeartbeat('push-cleanup', 'ok', `usunięto ${count ?? 0} wpisów starszych niż 7 dni`, Date.now() - t0);
    return NextResponse.json({ deleted: count });
}

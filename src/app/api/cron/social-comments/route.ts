import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { processNewComments } from '@/lib/socialComments';

export const maxDuration = 300; // 5 minutes — scans ALL posts/videos on connected channels

/**
 * Cron: Social Comments — every 15 minutes (6:00–22:00)
 *
 * Scans ALL posts/videos on Facebook, Instagram, and YouTube channels,
 * fetches new comments, generates AI draft replies for admin review.
 */
export async function GET(req: NextRequest) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
    try {
        // Verify cron secret (Vercel adds this automatically)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Allow local/dev calls without secret
            if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        console.log('[Cron] social-comments: starting...');
        const result = await processNewComments();
        console.log('[Cron] social-comments:', JSON.stringify(result));

        return NextResponse.json({
            ok: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('[Cron] social-comments error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

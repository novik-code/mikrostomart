import { NextRequest, NextResponse } from 'next/server';
import { processNewComments } from '@/lib/socialComments';

export const maxDuration = 120; // 2 minutes — may have many posts × platforms × GPT calls

/**
 * Cron: Social Comments — every 15 minutes (6:00–22:00)
 *
 * Fetches new comments from all published posts (last 7 days),
 * generates AI draft replies, and stores them for admin review.
 */
export async function GET(req: NextRequest) {
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

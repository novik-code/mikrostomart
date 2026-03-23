/**
 * Cron: Social Media Auto-Publisher
 * 
 * Publishes approved posts that are scheduled for now or earlier.
 * 
 * Schedule: every 15 minutes
 * Auth: CRON_SECRET header
 */

import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publishPost } from '@/lib/socialPublish';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
    const { searchParams } = new URL(req.url);
    const isManual = searchParams.get('manual') === 'true';

    if (!isManual) {
        const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
        if (cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const startTime = Date.now();
    console.log('[Social Publish Cron] Started');

    try {
        // Find approved posts with scheduled_for <= now
        const now = new Date().toISOString();
        const { data: posts, error } = await supabase
            .from('social_posts')
            .select('id, text_content, platform_ids, scheduled_for')
            .eq('status', 'approved')
            .lte('scheduled_for', now)
            .order('scheduled_for', { ascending: true })
            .limit(5); // Max 5 per run

        if (error) throw error;

        if (!posts || posts.length === 0) {
            console.log('[Social Publish Cron] No posts to publish');
            return NextResponse.json({ message: 'No posts to publish', published: 0 });
        }

        console.log(`[Social Publish Cron] Publishing ${posts.length} posts`);

        let published = 0;
        const results: { postId: string; status: string; details?: any }[] = [];

        for (const post of posts) {
            const elapsed = Date.now() - startTime;
            if (elapsed > 100_000) {
                console.log('[Social Publish Cron] Time budget exceeded');
                break;
            }

            try {
                const publishResults = await publishPost(post.id);
                const success = publishResults.some(r => r.success);
                if (success) published++;
                results.push({ postId: post.id, status: success ? 'published' : 'failed', details: publishResults });
            } catch (err: any) {
                console.error(`[Social Publish Cron] Error publishing ${post.id}:`, err.message);
                results.push({ postId: post.id, status: 'error', details: err.message });
            }
        }

        // Notify via Telegram
        if (published > 0) {
            try {
                const { sendTelegramNotification } = await import('@/lib/telegram');
                await sendTelegramNotification(
                    `📤 Social Media: ${published}/${posts.length} postów opublikowanych`,
                    'default'
                );
            } catch { /* optional */ }
        }

        const elapsed = Date.now() - startTime;
        console.log(`[Social Publish Cron] Done in ${elapsed}ms — ${published} published`);

        return NextResponse.json({
            message: `Published ${published}/${posts.length}`,
            published,
            results,
            elapsed: `${elapsed}ms`,
        });
    } catch (err: any) {
        console.error('[Social Publish Cron] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

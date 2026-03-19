/**
 * POST /api/social/publish
 * 
 * Manually publish an approved post to all target platforms.
 * Body: { post_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { publishPost } from '@/lib/socialPublish';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
    try {
        const { post_id } = await req.json();

        if (!post_id) {
            return NextResponse.json({ error: 'post_id wymagany' }, { status: 400 });
        }

        const results = await publishPost(post_id);

        const success = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        return NextResponse.json({
            success: success.length > 0,
            results,
            summary: {
                total: results.length,
                published: success.length,
                failed: failed.length,
            },
        });
    } catch (err: any) {
        console.error('[Social Publish] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

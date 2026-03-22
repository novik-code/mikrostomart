import { NextResponse } from 'next/server';
import { processNewComments } from '@/lib/socialComments';

export const maxDuration = 300; // 5 minutes — scans all posts on all channels

// POST — manually trigger fetching new comments and generating AI replies
export async function POST() {
    try {
        const result = await processNewComments();
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

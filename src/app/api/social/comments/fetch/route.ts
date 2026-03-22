import { NextResponse } from 'next/server';
import { processNewComments } from '@/lib/socialComments';

// POST — manually trigger fetching new comments and generating AI replies
export async function POST() {
    try {
        const result = await processNewComments();
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

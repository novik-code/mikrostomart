/**
 * POST /api/social/video-upload
 * 
 * Register a video in the processing queue.
 * Video is already uploaded directly to Supabase Storage from the client.
 * 
 * Accepts: JSON { videoUrl, fileSize, fileName }
 * Returns: { success, video: VideoQueueEntry }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { videoUrl, fileSize, fileName } = body;

        if (!videoUrl) {
            return NextResponse.json({ error: 'Brak URL wideo' }, { status: 400 });
        }

        console.log(`[Video Upload] Registering queue entry: ${fileName} (${((fileSize || 0) / 1024 / 1024).toFixed(1)}MB)`);

        // Get all active platform IDs for auto-publishing
        const { data: platforms } = await supabase
            .from('social_platforms')
            .select('id')
            .eq('is_active', true);
        
        const platformIds = platforms?.map(p => p.id) || [];

        // Create queue entry
        const { data: queueEntry, error: dbError } = await supabase
            .from('social_video_queue')
            .insert({
                raw_video_url: videoUrl,
                raw_video_size: fileSize || null,
                status: 'uploaded',
                target_platform_ids: platformIds,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        console.log(`[Video Upload] Queue entry created: ${queueEntry.id}`);

        return NextResponse.json({
            success: true,
            video: queueEntry,
        }, { status: 201 });

    } catch (err: any) {
        console.error('[Video Upload] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET — list video queue entries
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        let query = supabase
            .from('social_video_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ videos: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove a video from queue + storage
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        // Get video info
        const { data: video } = await supabase
            .from('social_video_queue')
            .select('raw_video_url, processed_video_url')
            .eq('id', id)
            .single();

        // Delete from storage
        if (video) {
            for (const url of [video.raw_video_url, video.processed_video_url]) {
                if (url) {
                    const parts = url.split('/social-media/');
                    if (parts[1]) {
                        await supabase.storage.from('social-media').remove([parts[1]]);
                    }
                }
            }
        }

        const { error } = await supabase
            .from('social_video_queue')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

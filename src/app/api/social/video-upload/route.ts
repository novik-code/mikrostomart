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
        const { videoUrl, fileSize, fileName, isPreEdited } = body;

        if (!videoUrl) {
            return NextResponse.json({ error: 'Brak URL wideo' }, { status: 400 });
        }

        const preEdited = isPreEdited === true;
        console.log(`[Video Upload] Registering queue entry: ${fileName} (${((fileSize || 0) / 1024 / 1024).toFixed(1)}MB)${preEdited ? ' [PRE-EDITED]' : ''}`);

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
                is_pre_edited: preEdited,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        console.log(`[Video Upload] Queue entry created: ${queueEntry.id}${preEdited ? ' (pre-edited fast-track)' : ''}`);

        return NextResponse.json({
            success: true,
            video: queueEntry,
        }, { status: 201 });

    } catch (err: any) {
        console.error('[Video Upload] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT — generate a signed upload URL for direct client-side upload
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { ext = 'mp4', contentType = 'video/mp4' } = body;

        const fileName = `videos/raw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'social-media');
        if (!bucketExists) {
            await supabase.storage.createBucket('social-media', {
                public: true,
                fileSizeLimit: 524288000, // 500MB
            });
            console.log('[Video Upload] Created social-media bucket');
        }

        // Create a signed upload URL (valid for 1 hour)
        const { data, error } = await supabase.storage
            .from('social-media')
            .createSignedUploadUrl(fileName);

        if (error) throw error;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/social-media/${fileName}`;

        console.log(`[Video Upload] Signed URL created for: ${fileName}`);

        return NextResponse.json({
            uploadUrl: data.signedUrl,
            publicUrl,
            token: data.token,
            path: fileName,
        });

    } catch (err: any) {
        console.error('[Video Upload] Signed URL Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH — force-set video status (admin control)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status = 'uploaded' } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const updateData: Record<string, any> = { 
            status, 
            error_message: null, 
            retry_count: 0,
        };
        
        // Set published_at when marking as done
        if (status === 'done') {
            updateData.published_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('social_video_queue')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        console.log(`[Video Admin] Force-set video ${id} → "${status}"`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
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

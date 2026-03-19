/**
 * POST /api/social/video-upload
 * 
 * Upload a video file to Supabase Storage and create a queue entry.
 * Called from mobile upload page (/admin/video).
 * 
 * Accepts: multipart/form-data with 'video' file
 * Returns: { success, video: VideoQueueEntry }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300; // 5 min for large video uploads

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('video') as File;

        if (!file) {
            return NextResponse.json({ error: 'Brak pliku wideo' }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Nieobsługiwany format: ${file.type}. Dopuszczalne: MP4, MOV, WebM, AVI` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `Plik za duży (${(file.size / 1024 / 1024).toFixed(0)}MB). Max: 500MB` },
                { status: 400 }
            );
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'mp4';
        const fileName = `raw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        console.log(`[Video Upload] Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) as ${fileName}`);

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        
        let uploadResult = await supabase.storage
            .from('social-media')
            .upload(`videos/${fileName}`, Buffer.from(arrayBuffer), {
                contentType: file.type,
                upsert: false,
            });

        // Create bucket if it doesn't exist
        if (uploadResult.error?.message?.includes('not found') || uploadResult.error?.message?.includes('Bucket')) {
            await supabase.storage.createBucket('social-media', { public: true });
            uploadResult = await supabase.storage
                .from('social-media')
                .upload(`videos/${fileName}`, Buffer.from(arrayBuffer), {
                    contentType: file.type,
                    upsert: false,
                });
        }

        if (uploadResult.error) {
            throw new Error(`Upload failed: ${uploadResult.error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('social-media')
            .getPublicUrl(`videos/${fileName}`);
        
        const videoUrl = urlData.publicUrl;

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
                raw_video_size: file.size,
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

/**
 * POST /api/cron/video-process
 * 
 * Cron job that processes uploaded videos through the AI pipeline.
 * Called every 5 minutes by Vercel Cron.
 * 
 * Pipeline: uploaded → transcribing → analyzing → generating → rendering → ready → publishing → done
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    transcribeVideo,
    analyzeVideoContent,
    generateVideoMetadata,
    buildShotstackTimeline,
    renderWithShotstack,
    checkShotstackRender,
} from '@/lib/videoAI';
import { publishPost } from '@/lib/socialPublish';

export const maxDuration = 300; // 5 min max

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const isManual = searchParams.get('manual') === 'true';

    if (!isManual) {
        const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
        if (cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const results: any[] = [];

        // ── Step 1: Process 'uploaded' videos (start transcription) ──
        const { data: uploaded } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'uploaded')
            .order('created_at', { ascending: true })
            .limit(1);

        if (uploaded && uploaded.length > 0) {
            const video = uploaded[0];
            console.log(`[VideoCron] Processing uploaded video: ${video.id}`);

            try {
                await supabase.from('social_video_queue')
                    .update({ status: 'transcribing' })
                    .eq('id', video.id);

                // Transcribe
                const transcript = await transcribeVideo(video.raw_video_url);

                await supabase.from('social_video_queue')
                    .update({
                        status: 'analyzing',
                        transcript: transcript.text,
                        transcript_srt: transcript.srt,
                        transcript_language: transcript.language,
                        raw_duration_seconds: transcript.duration,
                    })
                    .eq('id', video.id);

                // Analyze content
                const analysis = await analyzeVideoContent(transcript.text);

                await supabase.from('social_video_queue')
                    .update({
                        status: 'generating',
                        ai_analysis: analysis,
                    })
                    .eq('id', video.id);

                // Generate metadata
                const metadata = await generateVideoMetadata(transcript.text, analysis);

                await supabase.from('social_video_queue')
                    .update({
                        status: 'rendering',
                        title: metadata.title,
                        descriptions: metadata.descriptions,
                        hashtags: metadata.hashtags,
                    })
                    .eq('id', video.id);

                // Build Shotstack timeline and render
                // Shotstack needs a publicly accessible URL — generate a signed URL from Supabase Storage
                const logoUrl = (process.env.LOGO_WATERMARK_URL || '').trim() || null;
                
                let videoUrlForShotstack = (video.raw_video_url || '').trim();
                try {
                    // Extract storage path from the public URL
                    const urlObj = new URL(video.raw_video_url);
                    const storagePath = urlObj.pathname.split('/object/public/social-media/')[1] 
                        || urlObj.pathname.split('/object/sign/social-media/')[1];
                    
                    if (storagePath) {
                        const { data: signedData, error: signError } = await supabase.storage
                            .from('social-media')
                            .createSignedUrl(decodeURIComponent(storagePath), 3600); // 1 hour
                        
                        if (signedData?.signedUrl) {
                            videoUrlForShotstack = signedData.signedUrl;
                            console.log(`[VideoCron] Signed URL generated for Shotstack`);
                        } else if (signError) {
                            console.log(`[VideoCron] Signed URL error: ${signError.message}, using original URL`);
                        }
                    }
                } catch (urlErr: any) {
                    console.log(`[VideoCron] Could not create signed URL: ${urlErr.message}`);
                }

                const timeline = await buildShotstackTimeline(
                    videoUrlForShotstack,
                    transcript,
                    metadata,
                    logoUrl || undefined,
                );

                const { renderId } = await renderWithShotstack(timeline);

                await supabase.from('social_video_queue')
                    .update({
                        shotstack_render_id: renderId,
                        shotstack_config: timeline,
                    })
                    .eq('id', video.id);

                results.push({ id: video.id, action: 'started_pipeline', renderId });

            } catch (err: any) {
                console.error(`[VideoCron] Pipeline error for ${video.id}:`, err);
                await supabase.from('social_video_queue')
                    .update({
                        status: 'failed',
                        error_message: err.message,
                        retry_count: (video.retry_count || 0) + 1,
                    })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ── Step 2: Check 'rendering' videos (poll Shotstack) ──
        const { data: rendering } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'rendering')
            .not('shotstack_render_id', 'is', null);

        if (rendering) {
            for (const video of rendering) {
                try {
                    const renderStatus = await checkShotstackRender(video.shotstack_render_id);

                    if (renderStatus.status === 'done' && renderStatus.url) {
                        console.log(`[VideoCron] Render complete for ${video.id}: ${renderStatus.url}`);

                        // Download rendered video and upload to our storage
                        const videoRes = await fetch(renderStatus.url);
                        const videoBuffer = await videoRes.arrayBuffer();
                        const fileName = `processed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;

                        await supabase.storage
                            .from('social-media')
                            .upload(`videos/${fileName}`, Buffer.from(videoBuffer), {
                                contentType: 'video/mp4',
                                upsert: false,
                            });

                        const { data: urlData } = supabase.storage
                            .from('social-media')
                            .getPublicUrl(`videos/${fileName}`);

                        await supabase.from('social_video_queue')
                            .update({
                                status: 'review',
                                processed_video_url: urlData.publicUrl,
                                processed_at: new Date().toISOString(),
                            })
                            .eq('id', video.id);

                        results.push({ id: video.id, action: 'render_complete_awaiting_review' });

                    } else if (renderStatus.status === 'failed') {
                        await supabase.from('social_video_queue')
                            .update({
                                status: 'failed',
                                error_message: `Shotstack: ${renderStatus.error}`,
                            })
                            .eq('id', video.id);
                        results.push({ id: video.id, action: 'render_failed', error: renderStatus.error });

                    } else {
                        results.push({ id: video.id, action: 'still_rendering', status: renderStatus.status });
                    }
                } catch (err: any) {
                    console.error(`[VideoCron] Check render error for ${video.id}:`, err);
                }
            }
        }

        // ── Step 3: Manual review required ──
        // Videos go to 'review' status after rendering.
        // User reviews in /admin/video, can approve or re-render with notes.
        // Publishing only happens after manual approval.

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
        });

    } catch (err: any) {
        console.error('[VideoCron] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

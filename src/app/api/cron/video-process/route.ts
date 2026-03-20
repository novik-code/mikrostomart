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
                const logoUrl = process.env.LOGO_WATERMARK_URL || null;
                const timeline = await buildShotstackTimeline(
                    video.raw_video_url,
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
                                status: 'ready',
                                processed_video_url: urlData.publicUrl,
                                processed_at: new Date().toISOString(),
                            })
                            .eq('id', video.id);

                        results.push({ id: video.id, action: 'render_complete' });

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

        // ── Step 3: Auto-publish 'ready' videos ──
        const { data: ready } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'ready');

        if (ready) {
            for (const video of ready) {
                try {
                    console.log(`[VideoCron] Auto-publishing video ${video.id}`);

                    await supabase.from('social_video_queue')
                        .update({ status: 'publishing' })
                        .eq('id', video.id);

                    // Create social_post for publishing
                    const { data: post, error: postErr } = await supabase
                        .from('social_posts')
                        .insert({
                            status: 'approved',
                            platform_ids: video.target_platform_ids || [],
                            content_type: 'video_short',
                            text_content: video.descriptions?.youtube || video.title || '',
                            hashtags: video.hashtags || [],
                            video_url: video.processed_video_url || video.raw_video_url,
                            ai_model: 'gpt-4o + whisper + shotstack',
                            ai_prompt_used: `Auto-generated from video upload ${video.id}`,
                        })
                        .select()
                        .single();

                    if (postErr || !post) throw new Error(`Failed to create post: ${postErr?.message}`);

                    // Publish to all platforms
                    const publishResults = await publishPost(post.id);

                    await supabase.from('social_video_queue')
                        .update({
                            status: 'done',
                            social_post_id: post.id,
                            publish_results: publishResults,
                            published_at: new Date().toISOString(),
                        })
                        .eq('id', video.id);

                    results.push({ id: video.id, action: 'published', results: publishResults });

                } catch (err: any) {
                    console.error(`[VideoCron] Publish error for ${video.id}:`, err);
                    await supabase.from('social_video_queue')
                        .update({
                            status: 'failed',
                            error_message: `Publish: ${err.message}`,
                        })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'publish_failed', error: err.message });
                }
            }
        }

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

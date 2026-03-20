/**
 * GET /api/cron/video-process
 * 
 * Cron job that processes uploaded videos through the AI pipeline.
 * Called every 5 minutes by Vercel Cron.
 * 
 * Pipeline: uploaded → transcribing → analyzing → generating → captioning → review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    transcribeVideo,
    analyzeVideoContent,
    generateVideoMetadata,
} from '@/lib/videoAI';
import {
    submitForCaptioning,
    checkCaptioningStatus,
    downloadCaptionedVideo,
} from '@/lib/captionsAI';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

export const maxDuration = 300; // 5 min max

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Download ffmpeg binary to /tmp if not cached (same approach as videoAI.ts)
 */
async function ensureFfmpeg(): Promise<string> {
    const ffmpegBinPath = '/tmp/ffmpeg';
    
    if (!existsSync(ffmpegBinPath)) {
        console.log('[VideoCron] Downloading ffmpeg binary...');
        const urls = [
            'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/linux-x64',
            'https://github.com/eugeneware/ffmpeg-static/releases/download/b5.0.2/linux-x64',
            'https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4/linux-x64',
        ];
        
        for (const url of urls) {
            try {
                const res = await fetch(url, { redirect: 'follow' });
                if (!res.ok) continue;
                const buffer = Buffer.from(await res.arrayBuffer());
                if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
                    writeFileSync(ffmpegBinPath, buffer);
                    execSync(`chmod +x "${ffmpegBinPath}"`, { timeout: 5000 });
                    console.log('[VideoCron] ffmpeg ready');
                    return ffmpegBinPath;
                }
            } catch {}
        }
        throw new Error('Could not download ffmpeg');
    }
    
    return ffmpegBinPath;
}

/**
 * Compress video to under 50MB for Captions API
 */
async function compressVideoForCaptions(inputPath: string): Promise<string> {
    const ffmpeg = await ensureFfmpeg();
    const outputPath = inputPath.replace(/\.[^.]+$/, '_compressed.mp4');
    
    // Get input file size
    const inputSize = readFileSync(inputPath).length;
    const inputSizeMB = inputSize / (1024 * 1024);
    
    if (inputSizeMB <= 48) {
        console.log(`[VideoCron] Video already under 50MB (${inputSizeMB.toFixed(1)}MB), skipping compression`);
        // Still convert to MP4 if it's MOV
        if (inputPath.endsWith('.mov')) {
            execSync(
                `${ffmpeg} -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}" -y`,
                { timeout: 180000 }
            );
            return outputPath;
        }
        return inputPath;
    }
    
    console.log(`[VideoCron] Compressing video from ${inputSizeMB.toFixed(1)}MB to <50MB...`);
    
    // Target ~40MB for safety margin. For 60s video: ~5.3 Mbps
    execSync(
        `${ffmpeg} -i "${inputPath}" -c:v libx264 -preset fast -b:v 4500k -maxrate 5500k -bufsize 11000k -c:a aac -b:a 128k -movflags +faststart -vf "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease" "${outputPath}" -y`,
        { timeout: 300000 } // 5 min timeout
    );
    
    const outputSize = readFileSync(outputPath).length;
    console.log(`[VideoCron] Compressed: ${inputSizeMB.toFixed(1)}MB → ${(outputSize / 1024 / 1024).toFixed(1)}MB`);
    
    return outputPath;
}

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

        // ── Step 1: Process 'uploaded' videos ──
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
                // ── Transcription ──
                await supabase.from('social_video_queue')
                    .update({ status: 'transcribing' })
                    .eq('id', video.id);

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

                // ── AI Analysis ──
                const analysis = await analyzeVideoContent(transcript.text);

                await supabase.from('social_video_queue')
                    .update({
                        status: 'generating',
                        ai_analysis: analysis,
                    })
                    .eq('id', video.id);

                // ── Metadata Generation ──
                const metadata = await generateVideoMetadata(transcript.text, analysis);

                await supabase.from('social_video_queue')
                    .update({
                        status: 'captioning',
                        title: metadata.title,
                        descriptions: metadata.descriptions,
                        hashtags: metadata.hashtags,
                    })
                    .eq('id', video.id);

                // ── Compress & Submit to Captions API ──
                console.log('[VideoCron] Downloading video for compression...');
                const videoRes = await fetch(video.raw_video_url);
                const rawBuffer = Buffer.from(await videoRes.arrayBuffer());
                
                const ext = video.raw_video_url.includes('.mov') ? '.mov' : '.mp4';
                const tmpInput = `/tmp/captions_input_${Date.now()}${ext}`;
                writeFileSync(tmpInput, rawBuffer);
                
                const compressedPath = await compressVideoForCaptions(tmpInput);
                const compressedBuffer = readFileSync(compressedPath);
                
                // Clean up input file
                try { if (tmpInput !== compressedPath) unlinkSync(tmpInput); } catch {}
                
                // Submit to Captions API
                const { videoId: captionsVideoId } = await submitForCaptioning(
                    compressedBuffer,
                    `video_${video.id}.mp4`,
                );
                
                // Clean up compressed file
                try { unlinkSync(compressedPath); } catch {}

                await supabase.from('social_video_queue')
                    .update({
                        captions_video_id: captionsVideoId,
                    })
                    .eq('id', video.id);

                results.push({ id: video.id, action: 'started_captioning', captionsVideoId });

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

        // ── Step 2: Check 'captioning' videos (poll Captions API) ──
        const { data: captioning } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'captioning')
            .not('captions_video_id', 'is', null);

        if (captioning) {
            for (const video of captioning) {
                try {
                    const status = await checkCaptioningStatus(video.captions_video_id);

                    if (status.status === 'COMPLETE') {
                        console.log(`[VideoCron] Captions complete for ${video.id}`);

                        // Download captioned video
                        const captionedBuffer = await downloadCaptionedVideo(video.captions_video_id);
                        const fileName = `captioned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;

                        // Upload to Supabase Storage
                        await supabase.storage
                            .from('social-media')
                            .upload(`videos/${fileName}`, captionedBuffer, {
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

                        results.push({ id: video.id, action: 'captioning_complete' });

                    } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
                        await supabase.from('social_video_queue')
                            .update({
                                status: 'failed',
                                error_message: `Captions API: ${status.error || status.status}`,
                            })
                            .eq('id', video.id);
                        results.push({ id: video.id, action: 'captioning_failed', error: status.error });

                    } else {
                        results.push({ id: video.id, action: 'still_captioning', status: status.status, progress: status.progress });
                    }
                } catch (err: any) {
                    console.error(`[VideoCron] Check captions error for ${video.id}:`, err);
                }
            }
        }

        // ── Step 3: Manual review required ──
        // Videos go to 'review' status after captioning.
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

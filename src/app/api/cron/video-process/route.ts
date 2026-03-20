/**
 * GET /api/cron/video-process
 * 
 * Cron job that processes uploaded videos through the AI pipeline.
 * Called every 5 minutes by Vercel Cron.
 * 
 * Pipeline split into separate cron runs to avoid timeout:
 *   Run 1: uploaded    → transcribing → transcribed  (download + ffmpeg + Whisper)
 *   Run 2: transcribed → analyzing → captioning      (GPT-4o analysis + metadata + compress + submit Captions API)
 *   Run 3: captioning  → review                       (poll Captions API + download result)
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

export const maxDuration = 300; // 5 min max

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Download ffmpeg binary to /tmp if not cached
 */
async function ensureFfmpeg(): Promise<string> {
    const ffmpegBinPath = '/tmp/ffmpeg';
    if (existsSync(ffmpegBinPath)) return ffmpegBinPath;
    
    console.log('[VideoCron] Downloading ffmpeg...');
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
                return ffmpegBinPath;
            }
        } catch {}
    }
    throw new Error('Could not download ffmpeg');
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

        // ═══════════════════════════════════════════
        // STEP 0: Auto-recover stuck videos
        // These intermediate statuses should never persist between cron runs.
        // If found, it means a previous run timed out mid-processing.
        // ═══════════════════════════════════════════
        const stuckStatuses = ['transcribing', 'analyzing', 'generating', 'rendering'];
        
        const { data: stuck } = await supabase
            .from('social_video_queue')
            .select('id, status, retry_count')
            .in('status', stuckStatuses);
        
        if (stuck && stuck.length > 0) {
            for (const video of stuck) {
                const retries = (video.retry_count || 0) + 1;
                if (retries > 3) {
                    await supabase.from('social_video_queue')
                        .update({ status: 'failed', error_message: `Stuck in "${video.status}" after ${retries} retries` })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'stuck_failed', previousStatus: video.status });
                } else {
                    await supabase.from('social_video_queue')
                        .update({ status: 'uploaded', error_message: null, retry_count: retries })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'auto_recovered', previousStatus: video.status, retry: retries });
                    console.log(`[VideoCron] Auto-recovered stuck video ${video.id} from "${video.status}" (retry ${retries})`);
                }
            }
        }

        // ═══════════════════════════════════════════
        // STEP 1: Transcribe (uploaded → transcribed)
        // ═══════════════════════════════════════════
        const { data: uploaded } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'uploaded')
            .order('created_at', { ascending: true })
            .limit(1);

        if (uploaded && uploaded.length > 0) {
            const video = uploaded[0];
            console.log(`[VideoCron] Step 1: Transcribing video ${video.id}`);

            try {
                await supabase.from('social_video_queue')
                    .update({ status: 'transcribing' })
                    .eq('id', video.id);

                const transcript = await transcribeVideo(video.raw_video_url);

                await supabase.from('social_video_queue')
                    .update({
                        status: 'transcribed',
                        transcript: transcript.text,
                        transcript_srt: transcript.srt,
                        transcript_language: transcript.language,
                        raw_duration_seconds: transcript.duration,
                    })
                    .eq('id', video.id);

                results.push({ id: video.id, action: 'transcribed' });
            } catch (err: any) {
                console.error(`[VideoCron] Transcription error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Transcription: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // STEP 2: Analyze + Compress + Submit (transcribed → captioning)
        // ═══════════════════════════════════════════
        const { data: transcribed } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'transcribed')
            .order('created_at', { ascending: true })
            .limit(1);

        if (transcribed && transcribed.length > 0) {
            const video = transcribed[0];
            console.log(`[VideoCron] Step 2: Analyzing + submitting to Captions API for ${video.id}`);

            try {
                // AI Analysis
                await supabase.from('social_video_queue')
                    .update({ status: 'analyzing' })
                    .eq('id', video.id);

                const analysis = await analyzeVideoContent(video.transcript);
                const metadata = await generateVideoMetadata(video.transcript, analysis);

                await supabase.from('social_video_queue')
                    .update({
                        ai_analysis: analysis,
                        title: metadata.title,
                        descriptions: metadata.descriptions,
                        hashtags: metadata.hashtags,
                    })
                    .eq('id', video.id);

                // Compress video for Captions API (max 50MB)
                console.log('[VideoCron] Downloading video for compression...');
                const videoRes = await fetch(video.raw_video_url);
                const rawBuffer = Buffer.from(await videoRes.arrayBuffer());
                const inputSizeMB = rawBuffer.length / (1024 * 1024);
                
                const ext = video.raw_video_url.includes('.mov') ? '.mov' : '.mp4';
                const tmpInput = `/tmp/compress_${Date.now()}${ext}`;
                const tmpOutput = `/tmp/compress_${Date.now()}_out.mp4`;
                writeFileSync(tmpInput, rawBuffer);

                let compressedBuffer: Buffer;
                if (inputSizeMB > 48) {
                    console.log(`[VideoCron] Compressing ${inputSizeMB.toFixed(1)}MB → <50MB...`);
                    const ffmpeg = await ensureFfmpeg();
                    execSync(
                        `${ffmpeg} -i "${tmpInput}" -c:v libx264 -preset fast -b:v 4500k -maxrate 5500k -bufsize 11000k -c:a aac -b:a 128k -movflags +faststart "${tmpOutput}" -y`,
                        { timeout: 240000 }
                    );
                    compressedBuffer = readFileSync(tmpOutput);
                    console.log(`[VideoCron] Compressed: ${inputSizeMB.toFixed(1)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(1)}MB`);
                } else {
                    // Just convert MOV to MP4 if needed
                    if (ext === '.mov') {
                        const ffmpeg = await ensureFfmpeg();
                        execSync(`${ffmpeg} -i "${tmpInput}" -c copy -movflags +faststart "${tmpOutput}" -y`, { timeout: 120000 });
                        compressedBuffer = readFileSync(tmpOutput);
                    } else {
                        compressedBuffer = rawBuffer;
                    }
                }

                // Cleanup temp files
                try { unlinkSync(tmpInput); } catch {}
                try { if (existsSync(tmpOutput)) unlinkSync(tmpOutput); } catch {}

                // Submit to Captions API
                await supabase.from('social_video_queue')
                    .update({ status: 'captioning' })
                    .eq('id', video.id);

                const { videoId: captionsVideoId } = await submitForCaptioning(
                    compressedBuffer,
                    `video_${video.id}.mp4`,
                );

                await supabase.from('social_video_queue')
                    .update({ captions_video_id: captionsVideoId })
                    .eq('id', video.id);

                results.push({ id: video.id, action: 'submitted_to_captions', captionsVideoId });

            } catch (err: any) {
                console.error(`[VideoCron] Step 2 error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Analysis/Caption: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // STEP 3: Poll Captions API (captioning → review)
        // ═══════════════════════════════════════════
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
                        console.log(`[VideoCron] Captions complete for ${video.id}!`);

                        const captionedBuffer = await downloadCaptionedVideo(video.captions_video_id);
                        const fileName = `captioned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;

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
                            .update({ status: 'failed', error_message: `Captions: ${status.error || status.status}` })
                            .eq('id', video.id);
                        results.push({ id: video.id, action: 'captioning_failed', error: status.error });

                    } else {
                        results.push({ id: video.id, action: 'still_captioning', status: status.status, progress: status.progress });
                    }
                } catch (err: any) {
                    console.error(`[VideoCron] Poll error for ${video.id}:`, err);
                }
            }
        }

        // ═══════════════════════════════════════════
        // STEP 4: Manual review required
        // ═══════════════════════════════════════════
        // Videos at 'review' status wait for user approval in /admin/video.

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

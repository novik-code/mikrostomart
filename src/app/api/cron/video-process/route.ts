/**
 * GET /api/cron/video-process
 * 
 * Cron: processes uploaded videos through the AI pipeline.
 * 
 * Pipeline (one step per cron run):
 *   1: uploaded    → transcribed   (Whisper)
 *   2: transcribed → analyzed      (GPT-4o analysis + metadata)
 *   3: analyzed    → compressed    (ffmpeg compress + store to Supabase)
 *   4: compressed  → captioning    (submit to Captions API)
 *   5: captioning  → review        (poll + download result)
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
import { readFileSync, unlinkSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { execSync } from 'child_process';

export const maxDuration = 300;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get ffmpeg path. Uses ffmpeg-static (bundled via npm) — no runtime download needed.
 * Falls back to downloading from GitHub if bundled binary is missing.
 */
function getFfmpegPath(): string {
    // Try ffmpeg-static npm package first (bundled at build time)
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ffmpegStatic = require('ffmpeg-static') as string;
        if (ffmpegStatic && existsSync(ffmpegStatic)) {
            return ffmpegStatic;
        }
    } catch {}

    // Check /tmp cache
    if (existsSync('/tmp/ffmpeg')) return '/tmp/ffmpeg';

    throw new Error('ffmpeg not available');
}

/**
 * Download ffmpeg to /tmp as fallback (called asynchronously in background)
 */
async function downloadFfmpegFallback(): Promise<string> {
    if (existsSync('/tmp/ffmpeg')) return '/tmp/ffmpeg';
    
    console.log('[VideoCron] Downloading ffmpeg fallback...');
    const urls = [
        'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/linux-x64',
        'https://github.com/eugeneware/ffmpeg-static/releases/download/b5.0.2/linux-x64',
    ];
    
    for (const url of urls) {
        try {
            const res = await fetch(url, { redirect: 'follow' });
            if (!res.ok) continue;
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer[0] === 0x7F && buffer[1] === 0x45) {
                writeFileSync('/tmp/ffmpeg', buffer);
                chmodSync('/tmp/ffmpeg', 0o755);
                return '/tmp/ffmpeg';
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

        // Start background ffmpeg download (for fallback if npm binary missing)
        const ffmpegFallback = downloadFfmpegFallback().catch(() => null);

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
            console.log(`[VideoCron] Step 1: Transcribing ${video.id}`);
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
                    .update({ status: 'failed', error_message: `Step1: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // STEP 2: AI Analysis (transcribed → analyzed)
        // ═══════════════════════════════════════════
        const { data: transcribed } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'transcribed')
            .order('created_at', { ascending: true })
            .limit(1);

        if (transcribed && transcribed.length > 0) {
            const video = transcribed[0];
            console.log(`[VideoCron] Step 2: AI analysis for ${video.id}`);
            try {
                await supabase.from('social_video_queue')
                    .update({ status: 'analyzing' })
                    .eq('id', video.id);

                if (video.title && video.hashtags && video.ai_analysis) {
                    console.log(`[VideoCron] Metadata exists, skipping.`);
                } else {
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
                }

                await supabase.from('social_video_queue')
                    .update({ status: 'analyzed' })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'analyzed' });
            } catch (err: any) {
                console.error(`[VideoCron] Analysis error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Step2: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // STEP 3: Compress (analyzed → compressed)
        // Uses ffmpeg-static (bundled) — no download needed
        // ═══════════════════════════════════════════
        const { data: analyzed } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'analyzed')
            .order('created_at', { ascending: true })
            .limit(1);

        if (analyzed && analyzed.length > 0) {
            const video = analyzed[0];
            const inputSizeMB = (video.raw_video_size || 0) / (1024 * 1024);
            console.log(`[VideoCron] Step 3: Compress ${video.id} (${inputSizeMB.toFixed(1)}MB)`);

            try {
                await supabase.from('social_video_queue')
                    .update({ status: 'generating' })
                    .eq('id', video.id);

                const videoUrl = video.raw_video_url;
                const isMp4OrMov = /\.(mp4|m4v|mov)(\?|$)/i.test(videoUrl);

                if (inputSizeMB <= 48 && isMp4OrMov) {
                    // Small MP4/MOV — skip compression
                    console.log(`[VideoCron] Small (${inputSizeMB.toFixed(1)}MB), skipping.`);
                    await supabase.from('social_video_queue')
                        .update({ status: 'compressed', compressed_video_url: videoUrl })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'compressed_skip' });
                } else {
                    // Get ffmpeg (bundled via npm, instant)
                    let ffmpeg: string;
                    try {
                        ffmpeg = getFfmpegPath();
                    } catch {
                        // Wait for fallback download
                        const fallback = await ffmpegFallback;
                        if (!fallback) throw new Error('ffmpeg not available — retry will use cached binary');
                        ffmpeg = fallback;
                    }

                    const tmpInput = `/tmp/raw_${Date.now()}.mp4`;
                    const tmpOutput = `/tmp/out_${Date.now()}.mp4`;

                    // Download video with curl (streams to disk, memory-efficient)
                    console.log(`[VideoCron] Downloading ${inputSizeMB.toFixed(1)}MB...`);
                    const dlStart = Date.now();
                    execSync(`curl -sL -o "${tmpInput}" "${videoUrl}"`, { timeout: 200000 });
                    console.log(`[VideoCron] Downloaded in ${((Date.now() - dlStart) / 1000).toFixed(0)}s`);

                    // Compress with ffmpeg
                    console.log(`[VideoCron] Compressing...`);
                    const compStart = Date.now();
                    execSync(
                        `"${ffmpeg}" -i "${tmpInput}" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k -movflags +faststart "${tmpOutput}" -y 2>&1 | tail -5`,
                        { timeout: 80000 }
                    );
                    const compressedBuffer = readFileSync(tmpOutput);
                    const outputMB = compressedBuffer.length / (1024 * 1024);
                    console.log(`[VideoCron] ${inputSizeMB.toFixed(1)}MB → ${outputMB.toFixed(1)}MB in ${((Date.now() - compStart) / 1000).toFixed(0)}s`);
                    try { unlinkSync(tmpInput); } catch {}
                    try { unlinkSync(tmpOutput); } catch {}

                    // Upload compressed to Supabase Storage
                    const fileName = `videos/compressed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;
                    const { error: uploadErr } = await supabase.storage
                        .from('social-media')
                        .upload(fileName, compressedBuffer, { contentType: 'video/mp4', upsert: false });
                    if (uploadErr) throw new Error(`Upload: ${uploadErr.message}`);

                    const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(fileName);
                    await supabase.from('social_video_queue')
                        .update({ status: 'compressed', compressed_video_url: urlData.publicUrl })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'compressed', outputMB: outputMB.toFixed(1) });
                }
            } catch (err: any) {
                console.error(`[VideoCron] Compression error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Step3: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // STEP 4: Submit to Captions API (compressed → captioning)
        // ═══════════════════════════════════════════
        const { data: compressed } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'compressed')
            .order('created_at', { ascending: true })
            .limit(1);

        if (compressed && compressed.length > 0) {
            const video = compressed[0];
            console.log(`[VideoCron] Step 4: Submit to Captions API for ${video.id}`);
            try {
                const compUrl = video.compressed_video_url || video.raw_video_url;
                const res = await fetch(compUrl);
                if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                const buffer = Buffer.from(await res.arrayBuffer());
                const sizeMB = buffer.length / (1024 * 1024);
                console.log(`[VideoCron] Downloaded for submission: ${sizeMB.toFixed(1)}MB`);

                if (sizeMB > 50) throw new Error(`Still too large: ${sizeMB.toFixed(1)}MB (max 50MB)`);

                await supabase.from('social_video_queue')
                    .update({ status: 'captioning' })
                    .eq('id', video.id);

                const { videoId: captionsVideoId } = await submitForCaptioning(
                    buffer, `video_${video.id}.mp4`,
                );

                await supabase.from('social_video_queue')
                    .update({ captions_video_id: captionsVideoId })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'submitted', captionsVideoId });
            } catch (err: any) {
                console.error(`[VideoCron] Submit error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Step4: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // STEP 5: Poll Captions API (captioning → review)
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
                        const captionedBuffer = await downloadCaptionedVideo(video.captions_video_id);
                        const fileName = `videos/captioned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;
                        await supabase.storage.from('social-media')
                            .upload(fileName, captionedBuffer, { contentType: 'video/mp4', upsert: false });
                        const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(fileName);
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
                        results.push({ id: video.id, action: 'captioning_failed' });
                    } else {
                        results.push({ id: video.id, action: 'still_captioning', progress: status.progress });
                    }
                } catch (err: any) {
                    console.error(`[VideoCron] Poll error for ${video.id}:`, err);
                }
            }
        }

        return NextResponse.json({ success: true, processed: results.length, results });
    } catch (err: any) {
        console.error('[VideoCron] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

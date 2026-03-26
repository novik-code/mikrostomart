/**
 * GET /api/cron/video-process
 * 
 * Pipeline steps (one per cron run):
 *   1: uploaded    → transcribed   (Whisper)
 *   2: transcribed → analyzed      (GPT-4o analysis + metadata)
 *      ↳ if is_pre_edited: analyzed → ready (skip steps 3-5)
 *   3: analyzed    → compressed    (curl|ffmpeg pipe + store to Supabase)
 *   4: compressed  → captioning    (submit to Captions API)
 *   5: captioning  → review        (poll + download result)
 *   6: auto-publish ready+pre_edited → done (publish to all platforms)
 */

import { isDemoMode } from '@/lib/demoMode';
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
import { publishVideoToPlatforms } from '@/app/api/social/video-publish/route';
import { readFileSync, unlinkSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

export const maxDuration = 300;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Clean /tmp of large leftover files to prevent ENOSPC */
function cleanTmp() {
    try {
        const files = readdirSync('/tmp');
        for (const f of files) {
            if (/\.(mp4|mov|webm|wav|mp3|raw_|out_|conv_|compress_)/.test(f)) {
                try { unlinkSync(`/tmp/${f}`); } catch {}
            }
        }
    } catch {}
}

/** Get ffmpeg path — downloads from GitHub to /tmp if not cached */
async function ensureFfmpeg(): Promise<string> {
    // Check npm bundled binary first
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const p = require('ffmpeg-static') as string;
        if (p && existsSync(p)) return p;
    } catch {}

    // Check /tmp cache
    if (existsSync('/tmp/ffmpeg')) return '/tmp/ffmpeg';

    // Download from GitHub (~80MB, fits in /tmp alongside output)
    console.log('[VideoCron] Downloading ffmpeg to /tmp...');
    const start = Date.now();
    // IMPORTANT: asset name is "ffmpeg-linux-x64", NOT "linux-x64"
    execSync(
        'curl -sL -o /tmp/ffmpeg "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-x64" && chmod +x /tmp/ffmpeg',
        { timeout: 120000 }
    );
    console.log(`[VideoCron] ffmpeg downloaded in ${((Date.now() - start) / 1000).toFixed(0)}s`);
    
    // Validate it's actually an ELF binary, not a 404 page
    const header = readFileSync('/tmp/ffmpeg', { encoding: null }).subarray(0, 4);
    if (header[0] !== 0x7F || header[1] !== 0x45 || header[2] !== 0x4C || header[3] !== 0x46) {
        unlinkSync('/tmp/ffmpeg');
        throw new Error('Downloaded ffmpeg is not a valid ELF binary');
    }
    
    return '/tmp/ffmpeg';
}

export async function GET(req: NextRequest) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
    const { searchParams } = new URL(req.url);
    const isManual = searchParams.get('manual') === 'true';

    if (!isManual) {
        const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
        if (cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Clean leftover files from previous runs (ENOSPC prevention)
    cleanTmp();

    try {
        const results: any[] = [];

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
            console.log(`[VideoCron] Step 1: Transcribing ${video.id}${video.is_pre_edited ? ' [PRE-EDITED]' : ''}`);
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
        //   ↳ PRE-EDITED fast track: → ready (skip steps 3-5)
        // ═══════════════════════════════════════════
        const { data: transcribed } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'transcribed')
            .order('created_at', { ascending: true })
            .limit(1);

        if (transcribed && transcribed.length > 0) {
            const video = transcribed[0];
            console.log(`[VideoCron] Step 2: AI analysis for ${video.id}${video.is_pre_edited ? ' [PRE-EDITED → fast track]' : ''}`);
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

                // ── PRE-EDITED FAST TRACK ──
                // Skip compress → caption → review, go straight to ready
                if (video.is_pre_edited) {
                    console.log(`[VideoCron] ⚡ Pre-edited fast track: skipping compress/caption/review → ready`);
                    await supabase.from('social_video_queue')
                        .update({
                            status: 'ready',
                            processed_video_url: video.raw_video_url,
                            processed_at: new Date().toISOString(),
                        })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'fast_track_ready' });
                } else {
                    await supabase.from('social_video_queue')
                        .update({ status: 'analyzed' })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'analyzed' });
                }
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
        // 
        // STRATEGY: Pipe curl directly to ffmpeg — NO intermediate file.
        // This way only the compressed output (~10MB) touches /tmp.
        // Prevents ENOSPC on 512MB /tmp with 217MB input.
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

                // Clean /tmp again right before compression
                cleanTmp();

                const videoUrl = video.raw_video_url;
                const isMp4OrMov = /\.(mp4|m4v|mov)(\?|$)/i.test(videoUrl);

                if (inputSizeMB <= 48 && isMp4OrMov) {
                    // Small MP4/MOV — skip compression
                    await supabase.from('social_video_queue')
                        .update({ status: 'compressed', compressed_video_url: videoUrl })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'compressed_skip' });
                } else {
                    const ffmpeg = await ensureFfmpeg();
                    const tmpInput = `/tmp/input_${Date.now()}.mov`;
                    const tmpOutput = `/tmp/out_${Date.now()}.mp4`;

                    // Download video to /tmp (cleanTmp ensures space)
                    console.log(`[VideoCron] Downloading ${inputSizeMB.toFixed(1)}MB...`);
                    const dlStart = Date.now();
                    execSync(`curl -sL -o "${tmpInput}" "${videoUrl}"`, { timeout: 200000 });
                    console.log(`[VideoCron] Downloaded in ${((Date.now() - dlStart) / 1000).toFixed(0)}s`);

                    // Get video duration for bitrate calculation
                    let durationSec = 60; // fallback
                    try {
                        const ffprobePath = ffmpeg.replace(/ffmpeg$/, 'ffprobe');
                        const probeOut = execSync(
                            `"${ffprobePath}" -v error -show_entries format=duration -of csv=p=0 "${tmpInput}" 2>/dev/null`,
                            { timeout: 15000 }
                        ).toString().trim();
                        const parsed = parseFloat(probeOut);
                        if (parsed > 0) durationSec = parsed;
                    } catch { /* use fallback */ }
                    console.log(`[VideoCron] Duration: ${durationSec.toFixed(0)}s`);

                    // Determine ffmpeg settings based on file size
                    let ffmpegArgs: string;
                    if (inputSizeMB > 48) {
                        // Large file: use target bitrate to guarantee output <45MB
                        const targetMB = 45;
                        const targetBitrateKbps = Math.floor((targetMB * 8 * 1024) / durationSec);
                        const audioBitrate = 96;
                        const videoBitrate = Math.max(targetBitrateKbps - audioBitrate, 400);
                        console.log(`[VideoCron] Large file → target: ${targetMB}MB, video bitrate: ${videoBitrate}kbps`);
                        ffmpegArgs = `-c:v libx264 -preset fast -crf 30 -maxrate ${videoBitrate}k -bufsize ${videoBitrate * 2}k -c:a aac -b:a ${audioBitrate}k -movflags +faststart`;
                    } else {
                        // Normal file: quality-based compression
                        ffmpegArgs = `-c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k -movflags +faststart`;
                    }

                    // Compress with ffmpeg
                    console.log(`[VideoCron] Compressing...`);
                    const compStart = Date.now();
                    try {
                        const ver = execSync(`"${ffmpeg}" -version 2>&1 | head -1`, { timeout: 5000 }).toString().trim();
                        console.log(`[VideoCron] ffmpeg: ${ver}`);
                    } catch (e: any) {
                        console.error(`[VideoCron] ffmpeg test failed:`, e.message?.slice(0, 200));
                        throw new Error(`ffmpeg binary broken: ${e.message?.slice(0, 100)}`);
                    }
                    
                    try {
                        execSync(
                            `"${ffmpeg}" -i "${tmpInput}" ${ffmpegArgs} "${tmpOutput}" -y 2>/tmp/ffmpeg_err.log`,
                            { timeout: 250000 }
                        );
                    } catch (ffErr: any) {
                        let errLog = '';
                        try { errLog = readFileSync('/tmp/ffmpeg_err.log', 'utf-8').slice(-500); } catch {}
                        console.error(`[VideoCron] ffmpeg FAILED. stderr:`, errLog);
                        try { unlinkSync(tmpInput); } catch {}
                        throw new Error(`ffmpeg: ${errLog.slice(-200) || ffErr.message?.slice(0, 200)}`);
                    }
                    // Delete raw immediately to free space for readFileSync
                    try { unlinkSync(tmpInput); } catch {}
                    
                    const compressedBuffer = readFileSync(tmpOutput);
                    const outputMB = compressedBuffer.length / (1024 * 1024);
                    console.log(`[VideoCron] ${inputSizeMB.toFixed(1)}MB → ${outputMB.toFixed(1)}MB in ${((Date.now() - compStart) / 1000).toFixed(0)}s`);
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
                cleanTmp(); // Clean up after failure
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Step3: ${err.message?.slice(0, 200)}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message?.slice(0, 100) });
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

                if (sizeMB > 50) {
                    throw new Error(`Too large after compression: ${sizeMB.toFixed(1)}MB (max 50MB). Reset to 'analyzed' to re-compress with new bitrate settings.`);
                }

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

        // ═══════════════════════════════════════════
        // STEP 6: Auto-publish pre-edited videos (ready + is_pre_edited → done)
        // ═══════════════════════════════════════════
        const { data: readyPreEdited } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'ready')
            .eq('is_pre_edited', true)
            .order('created_at', { ascending: true })
            .limit(1);

        if (readyPreEdited && readyPreEdited.length > 0) {
            const video = readyPreEdited[0];
            console.log(`[VideoCron] Step 6: ⚡ Auto-publishing pre-edited video ${video.id}`);
            try {
                const publishResult = await publishVideoToPlatforms(
                    video.id,
                    video.target_platform_ids || undefined
                );
                console.log(`[VideoCron] Auto-publish result: ${publishResult.summary.published}/${publishResult.summary.total} platforms OK`);
                results.push({
                    id: video.id,
                    action: 'auto_published',
                    published: publishResult.summary.published,
                    failed: publishResult.summary.failed,
                });
            } catch (err: any) {
                console.error(`[VideoCron] Auto-publish error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `AutoPublish: ${err.message}` })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'auto_publish_failed', error: err.message });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, results });
    } catch (err: any) {
        console.error('[VideoCron] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

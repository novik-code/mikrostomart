/**
 * GET /api/cron/video-process
 * 
 * Cron job that processes uploaded videos through the AI pipeline.
 * Called every 5 minutes by Vercel Cron.
 * 
 * Pipeline split into separate cron runs to avoid Vercel 300s timeout:
 *   Run 1: uploaded    → transcribed       (Whisper transcription)
 *   Run 2: transcribed → analyzed          (GPT-4o analysis + metadata)
 *   Run 3: analyzed    → compressed        (ffmpeg download+compress + store to Supabase)
 *   Run 4: compressed  → captioning        (read compressed + submit to Captions API)
 *   Run 5: captioning  → review            (poll Captions API + download result)
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
                    .update({ status: 'failed', error_message: `Step1 Transcription: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
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

                // Skip AI if metadata already exists (e.g. manual reset)
                if (video.title && video.hashtags && video.ai_analysis) {
                    console.log(`[VideoCron] Metadata exists, skipping AI analysis.`);
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
                    .update({ status: 'failed', error_message: `Step2 Analysis: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'failed', error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // STEP 3: Compress + Store (analyzed → compressed)
        // Downloads video, compresses with ffmpeg, stores compressed to Supabase Storage
        // This is the heavy step — gets its own cron run
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

                let videoUrl = video.raw_video_url;
                const tmpOutput = `/tmp/compress_${Date.now()}_out.mp4`;

                if (inputSizeMB > 100) {
                    // Too large for Vercel — tell user to delete and re-upload (client-side compression handles it)
                    await supabase.from('social_video_queue')
                        .update({
                            status: 'failed',
                            error_message: `Plik za duży (${inputSizeMB.toFixed(0)}MB). Usuń i prześlij ponownie — przeglądarka skompresuje automatycznie.`,
                        })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'too_large', sizeMB: inputSizeMB.toFixed(0) });
                } else if (inputSizeMB > 48) {
                    // Medium file (48-100MB): download with curl, compress with ffmpeg
                    const ffmpeg = await ensureFfmpeg();
                    const tmpInput = `/tmp/raw_${Date.now()}.mp4`;
                    
                    console.log(`[VideoCron] Downloading ${inputSizeMB.toFixed(1)}MB with curl...`);
                    const dlStart = Date.now();
                    execSync(`curl -sL -o "${tmpInput}" "${videoUrl}"`, { timeout: 150000 });
                    console.log(`[VideoCron] Downloaded in ${((Date.now() - dlStart) / 1000).toFixed(0)}s`);
                    
                    console.log(`[VideoCron] Compressing with ffmpeg...`);
                    const compStart = Date.now();
                    try {
                        execSync(
                            `${ffmpeg} -i "${tmpInput}" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 96k -movflags +faststart "${tmpOutput}" -y 2>&1`,
                            { timeout: 120000 }
                        );
                    } catch (ffmpegErr: any) {
                        console.error(`[VideoCron] ffmpeg error:`, ffmpegErr.stdout?.toString()?.slice(-500) || ffmpegErr.message);
                        try { unlinkSync(tmpInput); } catch {}
                        throw new Error(`ffmpeg: ${ffmpegErr.message?.slice(0, 200)}`);
                    }
                    
                    const compressedBuffer = readFileSync(tmpOutput);
                    const outputSizeMB = compressedBuffer.length / (1024 * 1024);
                    console.log(`[VideoCron] Compressed: ${inputSizeMB.toFixed(1)}MB → ${outputSizeMB.toFixed(1)}MB in ${((Date.now() - compStart) / 1000).toFixed(0)}s`);
                    try { unlinkSync(tmpInput); } catch {}
                    try { unlinkSync(tmpOutput); } catch {}

                    // Store compressed video to Supabase Storage
                    const compressedFileName = `videos/compressed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;
                    const { error: uploadError } = await supabase.storage
                        .from('social-media')
                        .upload(compressedFileName, compressedBuffer, {
                            contentType: 'video/mp4',
                            upsert: false,
                        });
                    if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`);

                    const { data: urlData } = supabase.storage
                        .from('social-media')
                        .getPublicUrl(compressedFileName);

                    await supabase.from('social_video_queue')
                        .update({
                            status: 'compressed',
                            compressed_video_url: urlData.publicUrl,
                        })
                        .eq('id', video.id);

                    results.push({ id: video.id, action: 'compressed', outputMB: outputSizeMB.toFixed(1) });
                } else {
                    // Small file (<48MB): convert to mp4 if needed (Captions API requires mp4/mov)
                    const isWebm = videoUrl.includes('.webm');
                    if (isWebm) {
                        console.log(`[VideoCron] Converting WebM (${inputSizeMB.toFixed(1)}MB) → MP4...`);
                        const ffmpeg = await ensureFfmpeg();
                        const tmpInput = `/tmp/conv_${Date.now()}.webm`;
                        
                        // Download the small webm file
                        const webmRes = await fetch(videoUrl);
                        if (!webmRes.ok) throw new Error(`Download webm failed: ${webmRes.status}`);
                        writeFileSync(tmpInput, Buffer.from(await webmRes.arrayBuffer()));
                        
                        execSync(`${ffmpeg} -i "${tmpInput}" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${tmpOutput}" -y 2>&1`, { timeout: 60000 });
                        const mp4Buffer = readFileSync(tmpOutput);
                        console.log(`[VideoCron] Converted: ${inputSizeMB.toFixed(1)}MB WebM → ${(mp4Buffer.length / 1024 / 1024).toFixed(1)}MB MP4`);
                        
                        try { unlinkSync(tmpInput); } catch {}
                        try { unlinkSync(tmpOutput); } catch {}

                        // Store converted mp4 to Supabase Storage
                        const mp4FileName = `videos/converted_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;
                        const { error: uploadError } = await supabase.storage
                            .from('social-media')
                            .upload(mp4FileName, mp4Buffer, { contentType: 'video/mp4', upsert: false });
                        if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`);

                        const { data: urlData } = supabase.storage
                            .from('social-media')
                            .getPublicUrl(mp4FileName);

                        await supabase.from('social_video_queue')
                            .update({ status: 'compressed', compressed_video_url: urlData.publicUrl })
                            .eq('id', video.id);
                        results.push({ id: video.id, action: 'converted_webm_to_mp4', outputMB: (mp4Buffer.length / 1024 / 1024).toFixed(1) });
                    } else {
                        // Already mp4/mov and small — use directly
                        console.log(`[VideoCron] File small enough (${inputSizeMB.toFixed(1)}MB MP4), skipping.`);
                        await supabase.from('social_video_queue')
                            .update({ status: 'compressed', compressed_video_url: videoUrl })
                            .eq('id', video.id);
                        results.push({ id: video.id, action: 'compressed_skip', sizeMB: inputSizeMB.toFixed(1) });
                    }
                }
            } catch (err: any) {
                console.error(`[VideoCron] Compression error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Step3 Compress: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
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
            console.log(`[VideoCron] Step 4: Submitting to Captions API for ${video.id}`);

            try {
                // Download compressed video (should be <50MB now)
                const compUrl = video.compressed_video_url;
                const res = await fetch(compUrl);
                if (!res.ok) throw new Error(`Download compressed failed: ${res.status}`);
                const compressedBuffer = Buffer.from(await res.arrayBuffer());
                const sizeMB = compressedBuffer.length / (1024 * 1024);
                console.log(`[VideoCron] Downloaded compressed video: ${sizeMB.toFixed(1)}MB`);

                if (sizeMB > 50) {
                    throw new Error(`Compressed video still too large: ${sizeMB.toFixed(1)}MB (max 50MB)`);
                }

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
                console.error(`[VideoCron] Captions submit error:`, err);
                await supabase.from('social_video_queue')
                    .update({ status: 'failed', error_message: `Step4 Submit: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
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

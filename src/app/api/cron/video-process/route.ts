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
        // STEP 0: Smart auto-recover stuck videos
        // Check what data already exists and skip to appropriate step
        // ═══════════════════════════════════════════
        const stuckStatuses = ['transcribing', 'analyzing', 'generating', 'rendering'];
        
        const { data: stuck } = await supabase
            .from('social_video_queue')
            .select('*')
            .in('status', stuckStatuses);
        
        if (stuck && stuck.length > 0) {
            for (const video of stuck) {
                // Determine the best status to recover to based on existing data
                let recoverTo = 'uploaded';
                
                if (video.captions_video_id) {
                    // Already submitted to Captions API → just need to poll
                    recoverTo = 'captioning';
                } else if (video.title && video.hashtags && video.transcript) {
                    // Has metadata + transcript → skip to captioning step
                    recoverTo = 'transcribed';
                } else if (video.transcript) {
                    // Has transcript but no metadata → skip to analysis
                    recoverTo = 'transcribed';
                }
                // else: no transcript → start from beginning ('uploaded')

                console.log(`[VideoCron] Smart recovery: ${video.id} stuck in "${video.status}" → recovering to "${recoverTo}" (has transcript: ${!!video.transcript}, has title: ${!!video.title}, has captions_id: ${!!video.captions_video_id})`);

                await supabase.from('social_video_queue')
                    .update({ status: recoverTo, error_message: null, retry_count: 0 })
                    .eq('id', video.id);
                results.push({ id: video.id, action: 'smart_recovered', from: video.status, to: recoverTo });
            }
        }
        
        // Also recover 'failed' videos that have existing data (one-time fix)
        const { data: failed } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'failed')
            .not('transcript', 'is', null);
        
        if (failed && failed.length > 0) {
            for (const video of failed) {
                let recoverTo = 'uploaded';
                if (video.captions_video_id) {
                    recoverTo = 'captioning';
                } else if (video.transcript && video.title) {
                    recoverTo = 'transcribed';
                }
                
                if (recoverTo !== 'uploaded') {
                    console.log(`[VideoCron] Recovering failed video ${video.id} → "${recoverTo}" (has data)`);
                    await supabase.from('social_video_queue')
                        .update({ status: recoverTo, error_message: null, retry_count: 0 })
                        .eq('id', video.id);
                    results.push({ id: video.id, action: 'failed_recovered', to: recoverTo });
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
        // Skip AI analysis if metadata already exists (smart recovery case)
        // ═══════════════════════════════════════════
        const { data: transcribed } = await supabase
            .from('social_video_queue')
            .select('*')
            .eq('status', 'transcribed')
            .order('created_at', { ascending: true })
            .limit(1);

        if (transcribed && transcribed.length > 0) {
            const video = transcribed[0];
            console.log(`[VideoCron] Step 2: Processing ${video.id} (has title: ${!!video.title}, has analysis: ${!!video.ai_analysis})`);

            try {
                // Skip AI analysis if we already have the data
                if (!video.title || !video.hashtags || !video.ai_analysis) {
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
                    
                    console.log(`[VideoCron] AI analysis complete, metadata saved.`);
                } else {
                    console.log(`[VideoCron] Skipping AI analysis — metadata already exists.`);
                }

                // Update status to generating (about to download + compress)
                await supabase.from('social_video_queue')
                    .update({ status: 'generating' })
                    .eq('id', video.id);

                // Download video for compression — use signed URL if it's a Supabase Storage path
                let videoUrl = video.raw_video_url;
                if (videoUrl.includes('/storage/v1/object/public/')) {
                    // Already a public URL, use as-is
                } else if (videoUrl.includes('/storage/')) {
                    // Try creating a signed URL
                    const storagePath = videoUrl.split('/storage/v1/object/sign/').pop() || 
                                        videoUrl.split('/storage/v1/object/public/').pop() || '';
                    const bucket = storagePath.split('/')[0];
                    const filePath = storagePath.split('/').slice(1).join('/');
                    if (bucket && filePath) {
                        const { data: signedData } = await supabase.storage
                            .from(bucket)
                            .createSignedUrl(filePath, 600);
                        if (signedData?.signedUrl) videoUrl = signedData.signedUrl;
                    }
                }

                console.log(`[VideoCron] Downloading video (${(video.raw_video_size / 1024 / 1024).toFixed(1)}MB)...`);
                const downloadStart = Date.now();
                const videoRes = await fetch(videoUrl);
                if (!videoRes.ok) throw new Error(`Download failed: ${videoRes.status} ${videoRes.statusText}`);
                const rawBuffer = Buffer.from(await videoRes.arrayBuffer());
                const inputSizeMB = rawBuffer.length / (1024 * 1024);
                console.log(`[VideoCron] Downloaded ${inputSizeMB.toFixed(1)}MB in ${((Date.now() - downloadStart) / 1000).toFixed(1)}s`);
                
                const ext = video.raw_video_url.includes('.mov') ? '.mov' : '.mp4';
                const tmpInput = `/tmp/compress_${Date.now()}${ext}`;
                const tmpOutput = `/tmp/compress_${Date.now()}_out.mp4`;
                writeFileSync(tmpInput, rawBuffer);

                let compressedBuffer: Buffer;
                if (inputSizeMB > 48) {
                    console.log(`[VideoCron] Compressing ${inputSizeMB.toFixed(1)}MB → <50MB...`);
                    const ffmpeg = await ensureFfmpeg();
                    const compressStart = Date.now();
                    execSync(
                        `${ffmpeg} -i "${tmpInput}" -c:v libx264 -preset ultrafast -b:v 4500k -maxrate 5500k -bufsize 11000k -c:a aac -b:a 128k -movflags +faststart "${tmpOutput}" -y`,
                        { timeout: 180000 }
                    );
                    compressedBuffer = readFileSync(tmpOutput);
                    console.log(`[VideoCron] Compressed: ${inputSizeMB.toFixed(1)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(1)}MB in ${((Date.now() - compressStart) / 1000).toFixed(1)}s`);
                } else {
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
                    .update({ status: 'failed', error_message: `Step2: ${err.message}`, retry_count: (video.retry_count || 0) + 1 })
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

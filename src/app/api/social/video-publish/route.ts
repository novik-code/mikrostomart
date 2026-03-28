/**
 * POST /api/social/video-publish
 * 
 * Publish a processed video from the video queue to connected platforms.
 * Body: { video_id: string, platform_ids?: string[] }
 * 
 * Uses the existing socialPublish infrastructure but reads from social_video_queue
 * instead of social_posts. Creates a social_post entry for tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';

export const maxDuration = 300;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Refresh Google token if expired ────────────────────────────────
async function refreshGoogleToken(platformId: string, refreshToken: string): Promise<string | null> {
    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });
        const data = await res.json();
        if (data.access_token) {
            await supabase
                .from('social_platforms')
                .update({
                    access_token: data.access_token,
                    token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
                })
                .eq('id', platformId);
            return data.access_token;
        }
    } catch (err) {
        console.error('[VideoPublish] Failed to refresh Google token:', err);
    }
    return null;
}

// ── Refresh TikTok token if expired ────────────────────────────────
async function refreshTikTokToken(platformId: string, refreshToken: string): Promise<string | null> {
    try {
        const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });
        const data = await res.json();
        if (data.access_token) {
            await supabase
                .from('social_platforms')
                .update({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token || refreshToken,
                    token_expires_at: new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString(),
                })
                .eq('id', platformId);
            return data.access_token;
        }
    } catch (err) {
        console.error('[VideoPublish] Failed to refresh TikTok token:', err);
    }
    return null;
}

// ── Get public URL for video ──────────────────────────────────────
// Supabase Storage private bucket URLs need signed URLs for external access
async function getPublicVideoUrl(url: string): Promise<string> {
    // If it's already a fully public URL (not Supabase Storage), return as-is
    if (!url.includes('/storage/v1/object/')) return url;
    
    // If it's a public bucket URL, return as-is
    if (url.includes('/storage/v1/object/public/')) return url;
    
    // Extract bucket name and path from Supabase Storage URL
    const storageMatch = url.match(/\/storage\/v1\/object\/(?:sign\/)?([^/]+)\/(.+)/);
    if (!storageMatch) return url;
    
    const [, bucket, path] = storageMatch;
    
    // Generate a signed URL valid for 1 hour
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(decodeURIComponent(path), 3600);
    
    if (error || !data?.signedUrl) {
        console.warn(`[VideoPublish] Could not create signed URL for ${bucket}/${path}: ${error?.message || 'unknown'}. Using original URL.`);
        return url;
    }
    
    console.log(`[VideoPublish] Generated signed URL for ${bucket}/${path} (valid 1h)`);
    return data.signedUrl;
}

// ═══════════════════════════════════════════════════════════════════
// Exported: publishVideoToPlatforms
// Called by both the POST handler (manual) and the cron (auto-publish)
// ═══════════════════════════════════════════════════════════════════
export async function publishVideoToPlatforms(
    videoId: string,
    platformIds?: string[],
): Promise<{ success: boolean; results: any[]; summary: { total: number; published: number; failed: number } }> {
    // 1. Get video from queue
    const { data: video, error: vErr } = await supabase
        .from('social_video_queue')
        .select('*')
        .eq('id', videoId)
        .single();

    if (vErr || !video) throw new Error('Wideo nie znalezione');
    if (video.status !== 'ready' && video.status !== 'publishing') {
        throw new Error(`Status musi być "ready", jest "${video.status}"`);
    }

    const rawVideoUrl = video.processed_video_url || video.compressed_video_url || video.raw_video_url;
    if (!rawVideoUrl) throw new Error('Brak wideo do publikacji');

    // Generate public URL for platforms that need to download video from URL (FB, IG, TikTok)
    // Supabase Storage private bucket URLs are not accessible by external services
    const videoUrl = await getPublicVideoUrl(rawVideoUrl);

    // 2. Get selected platforms — ONLY those configured for video content
    let platformQuery = supabase
        .from('social_platforms')
        .select('*')
        .eq('is_active', true)
        .in('content_type', ['video', 'all']); // 🔑 Only video-enabled platforms

    // Use provided IDs, fallback to target_platform_ids from DB, then all video platforms
    const ids = platformIds && platformIds.length > 0
        ? platformIds
        : (video.target_platform_ids && video.target_platform_ids.length > 0 ? video.target_platform_ids : null);

    if (ids) {
        platformQuery = platformQuery.in('id', ids);
    }

    let { data: platforms } = await platformQuery;

    // Fallback: if target_platform_ids are stale (migration changed UUIDs), get ALL video platforms
    if ((!platforms || platforms.length === 0) && ids) {
        console.log(`[VideoPublish] No platforms found by IDs, falling back to all video platforms`);
        const { data: fallback } = await supabase
            .from('social_platforms')
            .select('*')
            .eq('is_active', true)
            .in('content_type', ['video', 'all']);
        platforms = fallback;
    }

    if (!platforms || platforms.length === 0) {
        throw new Error('Brak platform skonfigurowanych na wideo. Sprawdź content_type w ustawieniach platform.');
    }

    // Safety: double-check content_type filtering (in case of manual platform ID overrides)
    const videoPlatforms = platforms.filter((p: any) => p.content_type === 'video' || p.content_type === 'all');
    console.log(`[VideoPublish] Selected ${videoPlatforms.length} video-enabled platforms (filtered from ${platforms.length}): ${videoPlatforms.map((p: any) => `${p.platform}/${p.account_name}[${p.content_type}]`).join(', ')}`);

    // 3. Update video status to publishing
    await supabase
        .from('social_video_queue')
        .update({ status: 'publishing' })
        .eq('id', videoId);

    // 4. Prepare content
    const descriptions = video.descriptions || {};
    const hashtags: string[] = video.hashtags || [];
    const title = video.title || 'Mikrostomart';

    console.log(`[VideoPublish] Publishing to ${videoPlatforms.length} video platforms: ${videoPlatforms.map((p: any) => `${p.platform}(${p.account_name || p.account_id})`).join(', ')}`);

    // 5. Publish to each selected platform
    const results: any[] = [];

    for (const platform of videoPlatforms) {
        console.log(`[VideoPublish] Publishing to ${platform.platform}...`);
        
        // Get platform-specific description
        const text = descriptions[platform.platform] || descriptions.youtube || descriptions.instagram || title;
        
        try {
            let result: any = { platform: platform.platform, platform_id: platform.id, success: false };

            switch (platform.platform) {
                case 'facebook': {
                    const token = platform.access_token;
                    const pageId = platform.account_id || platform.config?.pages?.[0]?.id;
                    if (!token || !pageId) { result.error = 'Brak tokenu FB / Page ID'; break; }
                    
                    const fullText = hashtags.length > 0 ? `${text}\n\n${hashtags.map((h: string) => `#${h}`).join(' ')}` : text;
                    console.log(`[VideoPublish] FB: uploading video from URL: ${videoUrl.substring(0, 100)}...`);
                    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file_url: videoUrl,
                            description: fullText,
                            title: title.substring(0, 100),
                            access_token: token,
                        }),
                    });
                    const fbText = await res.text();
                    console.log(`[VideoPublish] FB response: HTTP ${res.status} — ${fbText.substring(0, 300)}`);
                    let data: any;
                    try { data = JSON.parse(fbText); } catch { throw new Error(`FB video: HTTP ${res.status} — ${fbText.substring(0, 200)}`); }
                    if (!res.ok || data.error) throw new Error(data.error?.message || `FB HTTP ${res.status}`);
                    result.success = true;
                    result.post_id = data.id;
                    break;
                }

                case 'instagram': {
                    const token = platform.access_token;
                    const igId = platform.account_id;
                    if (!token || !igId) { result.error = 'Brak tokenu IG / Business ID'; break; }

                    const caption = hashtags.length > 0 ? `${text}\n\n${hashtags.map((h: string) => `#${h}`).join(' ')}` : text;
                    
                    // Create Reels container
                    console.log(`[VideoPublish] IG: creating Reels container with video URL: ${videoUrl.substring(0, 100)}...`);
                    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            video_url: videoUrl,
                            media_type: 'REELS',
                            caption,
                            share_to_feed: true,
                            access_token: token,
                        }),
                    });
                    const containerText = await containerRes.text();
                    console.log(`[VideoPublish] IG container response: HTTP ${containerRes.status} — ${containerText.substring(0, 300)}`);
                    let containerData: any;
                    try { containerData = JSON.parse(containerText); } catch { throw new Error(`IG container: HTTP ${containerRes.status} — ${containerText.substring(0, 200)}`); }
                    if (!containerRes.ok || containerData.error) throw new Error(containerData.error?.message || `IG HTTP ${containerRes.status}`);
                    
                    // Wait for processing (max ~100s, polling every 5s)
                    const containerId = containerData.id;
                    for (let i = 0; i < 20; i++) {
                        await new Promise(r => setTimeout(r, 5000));
                        const sRes = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${token}`);
                        const sData = await sRes.json();
                        console.log(`[VideoPublish] IG processing status: ${sData.status_code} (attempt ${i + 1})`);
                        if (sData.status_code === 'FINISHED') break;
                        if (sData.status_code === 'ERROR') throw new Error('IG processing failed');
                    }
                    
                    // Publish
                    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ creation_id: containerId, access_token: token }),
                    });
                    const pubData = await pubRes.json();
                    if (pubData.error) throw new Error(pubData.error.message);
                    result.success = true;
                    result.post_id = pubData.id;
                    break;
                }

                case 'youtube': {
                    let token = platform.access_token;
                    if (!token) { result.error = 'Brak tokenu YouTube'; break; }
                    
                    // Refresh if expired
                    if (platform.token_expires_at && new Date(platform.token_expires_at) < new Date()) {
                        if (platform.refresh_token) {
                            const newToken = await refreshGoogleToken(platform.id, platform.refresh_token);
                            if (newToken) token = newToken;
                            else { result.error = 'Token YT wygasł'; break; }
                        }
                    }
                    
                    // Download video for upload
                    const vidRes = await fetch(videoUrl);
                    const vidBuf = await vidRes.arrayBuffer();
                    
                    const description = hashtags.length > 0 ? `${text}\n\n${hashtags.map((h: string) => `#${h}`).join(' ')}` : text;
                    
                    // Init resumable upload
                    const initRes = await fetch(
                        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'X-Upload-Content-Type': 'video/*',
                                'X-Upload-Content-Length': vidBuf.byteLength.toString(),
                            },
                            body: JSON.stringify({
                                snippet: {
                                    title: title.substring(0, 100),
                                    description,
                                    tags: hashtags,
                                    categoryId: '26',
                                },
                                status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
                            }),
                        }
                    );
                    if (!initRes.ok) {
                        const e = await initRes.json().catch(() => ({}));
                        throw new Error(e.error?.message || `YT init: ${initRes.status}`);
                    }
                    
                    const uploadUrl = initRes.headers.get('location');
                    if (!uploadUrl) throw new Error('No upload URL');
                    
                    const upRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'video/*' },
                        body: vidBuf,
                    });
                    const upData = await upRes.json();
                    if (!upRes.ok) throw new Error(upData.error?.message || 'YT upload failed');
                    result.success = true;
                    result.post_id = upData.id;
                    break;
                }

                case 'tiktok': {
                    let token = platform.access_token;
                    if (!token) { result.error = 'Brak tokenu TikTok'; break; }
                    
                    // Auto-refresh expired TikTok token
                    if (platform.token_expires_at && new Date(platform.token_expires_at) < new Date()) {
                        if (platform.refresh_token) {
                            const newToken = await refreshTikTokToken(platform.id, platform.refresh_token);
                            if (newToken) token = newToken;
                            else { result.error = 'Token TikTok wygasł i nie udało się go odświeżyć'; break; }
                        }
                    }
                    
                    // Step 1: Query creator info for privacy_level_options
                    console.log(`[VideoPublish] TikTok: querying creator info...`);
                    let privacyLevel = 'SELF_ONLY'; // safe default
                    try {
                        const creatorRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
                            body: JSON.stringify({}),
                        });
                        const creatorData = await creatorRes.json();
                        console.log(`[VideoPublish] TikTok creator info: ${JSON.stringify(creatorData).substring(0, 300)}`);
                        const options = creatorData.data?.privacy_level_options || [];
                        if (options.includes('PUBLIC_TO_EVERYONE')) privacyLevel = 'PUBLIC_TO_EVERYONE';
                        else if (options.includes('FOLLOWER_OF_CREATOR')) privacyLevel = 'FOLLOWER_OF_CREATOR';
                        else if (options.includes('MUTUAL_FOLLOW_FRIENDS')) privacyLevel = 'MUTUAL_FOLLOW_FRIENDS';
                    } catch (e: any) {
                        console.log(`[VideoPublish] TikTok creator info failed: ${e.message}, using ${privacyLevel}`);
                    }
                    
                    // Step 2: Download video for direct upload
                    console.log(`[VideoPublish] TikTok: downloading video for FILE_UPLOAD...`);
                    const ttVidRes = await fetch(videoUrl);
                    if (!ttVidRes.ok) throw new Error(`TikTok video download failed: ${ttVidRes.status}`);
                    const ttVidBuf = Buffer.from(await ttVidRes.arrayBuffer());
                    const ttVideoSize = ttVidBuf.length;
                    
                    // Calculate chunk parameters per TikTok requirements:
                    // <5MB: whole upload (chunk_size = video_size, count = 1)
                    // >=5MB: use 10MB chunks (min 5MB, max 64MB per chunk)
                    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
                    let chunkSize: number;
                    let totalChunks: number;
                    
                    if (ttVideoSize < 5 * 1024 * 1024) {
                        // < 5MB: upload as whole
                        chunkSize = ttVideoSize;
                        totalChunks = 1;
                    } else {
                        chunkSize = CHUNK_SIZE;
                        // Per TikTok docs: total_chunk_count = floor(video_size / chunk_size)
                        // Last chunk absorbs trailing bytes (can be up to 128MB)
                        totalChunks = Math.max(1, Math.floor(ttVideoSize / chunkSize));
                    }
                    
                    console.log(`[VideoPublish] TikTok: video ${(ttVideoSize / 1024 / 1024).toFixed(1)}MB, ${totalChunks} chunks of ${(chunkSize / 1024 / 1024).toFixed(1)}MB, privacy: ${privacyLevel}`);
                    
                    // Step 3: Init upload — retry with SELF_ONLY if unaudited error
                    const tryInit = async (pl: string) => {
                        const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
                            body: JSON.stringify({
                                post_info: {
                                    title: title.substring(0, 2200),
                                    privacy_level: pl,
                                    disable_duet: false,
                                    disable_comment: false,
                                    disable_stitch: false,
                                    brand_content_toggle: false,
                                    brand_organic_toggle: false,
                                },
                                source_info: {
                                    source: 'FILE_UPLOAD',
                                    video_size: ttVideoSize,
                                    chunk_size: chunkSize,
                                    total_chunk_count: totalChunks,
                                },
                            }),
                        });
                        const text = await res.text();
                        console.log(`[VideoPublish] TikTok init (${pl}): ${text.substring(0, 500)}`);
                        let data: any;
                        try { data = JSON.parse(text); } catch { throw new Error(`TikTok init parse: ${text.substring(0, 200)}`); }
                        return data;
                    };

                    let initData = await tryInit(privacyLevel);
                    let usedPrivacy = privacyLevel;
                    
                    // If unaudited app error, retry with SELF_ONLY
                    if (initData.error?.code === 'unaudited_client_can_only_post_to_private_accounts' && privacyLevel !== 'SELF_ONLY') {
                        console.log(`[VideoPublish] TikTok: unaudited app, retrying with SELF_ONLY...`);
                        initData = await tryInit('SELF_ONLY');
                        usedPrivacy = 'SELF_ONLY';
                    }
                    
                    if (initData.error?.code && initData.error.code !== 'ok') {
                        throw new Error(initData.error.message || `TikTok init: ${initData.error.code}`);
                    }
                    
                    const uploadUrl = initData.data?.upload_url;
                    const publishId = initData.data?.publish_id;
                    if (!uploadUrl) throw new Error('TikTok: no upload_url returned');
                    
                    // Step 4: Upload video chunks sequentially
                    for (let i = 0; i < totalChunks; i++) {
                        const start = i * chunkSize;
                        const end = Math.min(start + chunkSize, ttVideoSize);
                        const chunk = ttVidBuf.subarray(start, end);
                        const chunkLen = end - start;
                        
                        console.log(`[VideoPublish] TikTok: uploading chunk ${i + 1}/${totalChunks} (${start}-${end - 1}/${ttVideoSize})`);
                        const uploadRes = await fetch(uploadUrl, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'video/mp4',
                                'Content-Range': `bytes ${start}-${end - 1}/${ttVideoSize}`,
                                'Content-Length': chunkLen.toString(),
                            },
                            body: chunk,
                        });
                        console.log(`[VideoPublish] TikTok chunk ${i + 1} response: ${uploadRes.status}`);
                        
                        // 201 = all done, 206 = partial (more chunks expected)
                        if (uploadRes.status !== 201 && uploadRes.status !== 206) {
                            const errText = await uploadRes.text();
                            throw new Error(`TikTok upload chunk ${i + 1} failed: ${uploadRes.status} — ${errText.substring(0, 200)}`);
                        }
                    }
                    
                    result.success = true;
                    result.post_id = publishId + (usedPrivacy === 'SELF_ONLY' ? ' (prywatne — zmień widoczność na TikToku)' : '');
                    break;
                }

                default:
                    result.error = `Platforma ${platform.platform} nieobsługiwana`;
            }

            results.push(result);
            console.log(`[VideoPublish] ${platform.platform}: ${result.success ? 'OK' : result.error}`);
        } catch (err: any) {
            results.push({ platform: platform.platform, platform_id: platform.id, success: false, error: err.message });
            console.error(`[VideoPublish] ${platform.platform} error:`, err.message);
        }
    }

    // 6. Update video status
    const anySuccess = results.some(r => r.success);
    const errors: Record<string, string> = {};

    for (const r of results) {
        if (!r.success && r.error) errors[r.platform] = r.error;
    }

    await supabase
        .from('social_video_queue')
        .update({
            status: anySuccess ? 'done' : 'ready',  // Keep 'ready' on failure so user can retry
            published_at: anySuccess ? new Date().toISOString() : undefined,
            error_message: Object.keys(errors).length > 0 
                ? Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join('; ') 
                : null,
        })
        .eq('id', videoId);

    return {
        success: anySuccess,
        results,
        summary: {
            total: results.length,
            published: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
        },
    };
}

// ═══════════════════════════════════════════════════════════════════
// HTTP POST handler — manual publish from admin UI
// ═══════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
    try {
        const { video_id, platform_ids } = await req.json();

        if (!video_id) {
            return NextResponse.json({ error: 'video_id wymagany' }, { status: 400 });
        }

        const result = await publishVideoToPlatforms(video_id, platform_ids);
        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[VideoPublish] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

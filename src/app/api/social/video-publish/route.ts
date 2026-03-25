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

    const videoUrl = video.processed_video_url || video.compressed_video_url || video.raw_video_url;
    if (!videoUrl) throw new Error('Brak wideo do publikacji');

    // 2. Get selected platforms by their IDs
    let platformQuery = supabase
        .from('social_platforms')
        .select('*')
        .eq('is_active', true);

    // Use provided IDs, fallback to target_platform_ids from DB, then all active
    const ids = platformIds && platformIds.length > 0
        ? platformIds
        : (video.target_platform_ids && video.target_platform_ids.length > 0 ? video.target_platform_ids : null);

    if (ids) {
        platformQuery = platformQuery.in('id', ids);
    }

    const { data: platforms } = await platformQuery;

    if (!platforms || platforms.length === 0) {
        throw new Error('Brak podłączonych platform. Podłącz konta w zakładce Social Media.');
    }

    // 3. Update video status to publishing
    await supabase
        .from('social_video_queue')
        .update({ status: 'publishing' })
        .eq('id', videoId);

    // 4. Prepare content
    const descriptions = video.descriptions || {};
    const hashtags: string[] = video.hashtags || [];
    const title = video.title || 'Mikrostomart';

    console.log(`[VideoPublish] Publishing to ${platforms.length} selected platforms: ${platforms.map((p: any) => `${p.platform}(${p.account_name || p.account_id})`).join(', ')}`);

    // 5. Publish to each selected platform
    const results: any[] = [];

    for (const platform of platforms) {
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
                    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file_url: videoUrl,
                            description: fullText,
                            title: title.substring(0, 100),
                            access_token: token,
                        }),
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
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
                    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
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
                    const containerData = await containerRes.json();
                    if (containerData.error) throw new Error(containerData.error.message);
                    
                    // Wait for processing (max ~100s, polling every 5s)
                    const containerId = containerData.id;
                    for (let i = 0; i < 20; i++) {
                        await new Promise(r => setTimeout(r, 5000));
                        const sRes = await fetch(`https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${token}`);
                        const sData = await sRes.json();
                        console.log(`[VideoPublish] IG processing status: ${sData.status_code} (attempt ${i + 1})`);
                        if (sData.status_code === 'FINISHED') break;
                        if (sData.status_code === 'ERROR') throw new Error('IG processing failed');
                    }
                    
                    // Publish
                    const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
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
                    const token = platform.access_token;
                    if (!token) { result.error = 'Brak tokenu TikTok'; break; }
                    
                    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            post_info: {
                                title: title.substring(0, 150),
                                privacy_level: 'PUBLIC_TO_EVERYONE',
                                disable_duet: false, disable_comment: false, disable_stitch: false,
                            },
                            source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
                        }),
                    });
                    const initData = await initRes.json();
                    if (initData.error?.code) throw new Error(initData.error.message || `TikTok: ${initData.error.code}`);
                    result.success = true;
                    result.post_id = initData.data?.publish_id;
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
            status: anySuccess ? 'done' : 'failed',
            published_at: anySuccess ? new Date().toISOString() : null,
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

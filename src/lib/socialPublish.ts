/**
 * Social Media Publishing Service
 * 
 * Publishes posts to connected platforms via their APIs.
 * Each platform requires a valid access_token in social_platforms table.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PublishResult {
    platform: string;
    platform_id: string;
    success: boolean;
    post_id?: string;
    error?: string;
}

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
        console.error('[Publish] Failed to refresh Google token:', err);
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
            console.log(`[Publish] TikTok token refreshed for platform ${platformId}`);
            return data.access_token;
        }
        console.error('[Publish] TikTok refresh response missing access_token:', JSON.stringify(data));
    } catch (err) {
        console.error('[Publish] Failed to refresh TikTok token:', err);
    }
    return null;
}

// ── Facebook Publishing (supports text, image, and video/Reels) ─────
async function publishToFacebook(
    platform: any,
    text: string,
    hashtags: string[],
    imageUrl?: string | null,
    videoUrl?: string | null,
): Promise<PublishResult> {
    const result: PublishResult = { platform: 'facebook', platform_id: platform.id, success: false };

    try {
        const token = platform.access_token;
        const pageId = platform.account_id || platform.config?.pages?.[0]?.id;

        if (!token || !pageId) {
            result.error = 'Brak tokenu lub Page ID — podłącz konto przez OAuth';
            return result;
        }

        const fullText = hashtags.length > 0
            ? `${text}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
            : text;

        let endpoint: string;
        const body: any = { access_token: token };

        if (videoUrl) {
            // Video / Reels post
            endpoint = `https://graph.facebook.com/v21.0/${pageId}/videos`;
            body.file_url = videoUrl;
            body.description = fullText;
            body.title = text.substring(0, 100);
        } else if (imageUrl) {
            // Photo post
            endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
            body.url = imageUrl;
            body.message = fullText;
        } else {
            // Text-only post
            endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
            body.message = fullText;
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        result.success = true;
        result.post_id = data.id || data.post_id;
    } catch (err: any) {
        result.error = err.message;
    }

    return result;
}

// ── Instagram Publishing (supports image and video/Reels) ────────────
async function publishToInstagram(
    platform: any,
    text: string,
    hashtags: string[],
    imageUrl?: string | null,
    videoUrl?: string | null,
): Promise<PublishResult> {
    const result: PublishResult = { platform: 'instagram', platform_id: platform.id, success: false };

    try {
        const token = platform.access_token;
        const igId = platform.account_id;

        if (!token || !igId) {
            result.error = 'Brak tokenu IG lub IG Business ID — podłącz konto przez OAuth';
            return result;
        }

        if (!imageUrl && !videoUrl) {
            result.error = 'Instagram wymaga zdjęcia lub wideo';
            return result;
        }

        const fullCaption = hashtags.length > 0
            ? `${text}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
            : text;

        // Step 1: Create media container (image or Reel)
        const containerBody: any = {
            caption: fullCaption,
            access_token: token,
        };

        if (videoUrl) {
            // Instagram Reel
            containerBody.video_url = videoUrl;
            containerBody.media_type = 'REELS';
            containerBody.share_to_feed = true;
        } else {
            // Image post
            containerBody.image_url = imageUrl;
        }

        const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(containerBody),
        });

        const containerData = await containerRes.json();
        if (containerData.error) throw new Error(containerData.error.message);

        const containerId = containerData.id;

        // Step 1.5: Wait for container processing (required for BOTH image and video)
        const maxAttempts = videoUrl ? 30 : 15; // video: 5min, image: 30s
        const pollInterval = videoUrl ? 10000 : 2000; // video: 10s, image: 2s
        let containerReady = false;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(r => setTimeout(r, pollInterval));
            const statusRes = await fetch(
                `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${token}`
            );
            const statusData = await statusRes.json();
            console.log(`[IG Publish] Container ${containerId} status: ${statusData.status_code} (attempt ${attempt + 1})`);
            
            if (statusData.status_code === 'FINISHED') {
                containerReady = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                throw new Error('Instagram media processing failed');
            }
        }

        if (!containerReady) {
            throw new Error('Instagram media processing timeout');
        }

        // Step 2: Publish the container
        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: containerId,
                access_token: token,
            }),
        });

        const publishData = await publishRes.json();
        if (publishData.error) throw new Error(publishData.error.message);

        result.success = true;
        result.post_id = publishData.id;
    } catch (err: any) {
        result.error = err.message;
    }

    return result;
}

// ── TikTok Publishing (video only) ─────────────────────────────────
async function publishToTikTok(
    platform: any,
    text: string,
    hashtags: string[],
    videoUrl?: string | null,
): Promise<PublishResult> {
    const result: PublishResult = { platform: 'tiktok', platform_id: platform.id, success: false };

    try {
        let token = platform.access_token;

        if (!token) {
            result.error = 'Brak tokenu TikTok — podłącz konto przez OAuth';
            return result;
        }

        // Auto-refresh expired TikTok token
        if (platform.token_expires_at && new Date(platform.token_expires_at) < new Date()) {
            if (platform.refresh_token) {
                const newToken = await refreshTikTokToken(platform.id, platform.refresh_token);
                if (newToken) token = newToken;
                else {
                    result.error = 'Token TikTok wygasł i nie udało się go odświeżyć';
                    return result;
                }
            }
        }

        if (!videoUrl) {
            result.error = 'TikTok wymaga wideo — ustaw typ treści na video_short';
            return result;
        }

        // TikTok Content Posting API (v2)
        // Step 1: Initialize upload
        const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_info: {
                    title: text.substring(0, 150), // TikTok title limit
                    privacy_level: 'PUBLIC_TO_EVERYONE',
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false,
                },
                source_info: {
                    source: 'PULL_FROM_URL',
                    video_url: videoUrl,
                },
            }),
        });

        const initData = await initRes.json();
        if (initData.error?.code) throw new Error(initData.error.message || `TikTok error: ${initData.error.code}`);

        result.success = true;
        result.post_id = initData.data?.publish_id;
    } catch (err: any) {
        result.error = err.message;
    }

    return result;
}

// ── YouTube Publishing (video — placeholder, requires upload) ──────
async function publishToYouTube(
    platform: any,
    text: string,
    hashtags: string[],
    videoUrl?: string | null,
    title?: string,
): Promise<PublishResult> {
    const result: PublishResult = { platform: 'youtube', platform_id: platform.id, success: false };

    try {
        let token = platform.access_token;

        if (!token) {
            result.error = 'Brak tokenu YouTube — podłącz konto przez OAuth';
            return result;
        }

        // Check if token needs refresh
        if (platform.token_expires_at && new Date(platform.token_expires_at) < new Date()) {
            if (platform.refresh_token) {
                const newToken = await refreshGoogleToken(platform.id, platform.refresh_token);
                if (newToken) token = newToken;
                else {
                    result.error = 'Token wygasł i nie udało się go odświeżyć';
                    return result;
                }
            }
        }

        if (!videoUrl) {
            // For text-only / image posts, create a community post (not supported via API easily)
            result.error = 'YouTube wymaga wideo do publikacji przez API';
            return result;
        }

        // Download video and upload to YouTube
        const videoRes = await fetch(videoUrl);
        const videoBuffer = await videoRes.arrayBuffer();

        const description = hashtags.length > 0
            ? `${text}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
            : text;

        // Step 1: Initialize resumable upload
        const initRes = await fetch(
            'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Type': 'video/*',
                    'X-Upload-Content-Length': videoBuffer.byteLength.toString(),
                },
                body: JSON.stringify({
                    snippet: {
                        title: title || text.substring(0, 100),
                        description,
                        tags: hashtags,
                        categoryId: '26', // How-to & Style
                    },
                    status: {
                        privacyStatus: 'public',
                        selfDeclaredMadeForKids: false,
                    },
                }),
            }
        );

        if (!initRes.ok) {
            const errData = await initRes.json().catch(() => ({}));
            throw new Error(errData.error?.message || `YouTube init failed: ${initRes.status}`);
        }

        const uploadUrl = initRes.headers.get('location');
        if (!uploadUrl) throw new Error('No upload URL returned');

        // Step 2: Upload video
        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'video/*',
            },
            body: videoBuffer,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed');

        result.success = true;
        result.post_id = uploadData.id;
    } catch (err: any) {
        result.error = err.message;
    }

    return result;
}

// ── Main publish function ──────────────────────────────────────────

export async function publishPost(postId: string): Promise<PublishResult[]> {
    // 1. Get post
    const { data: post, error: postErr } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (postErr || !post) throw new Error('Post nie znaleziony');
    if (post.status !== 'approved') throw new Error('Post musi mieć status "approved"');

    // 2. Update status to publishing
    await supabase.from('social_posts').update({ status: 'publishing' }).eq('id', postId);

    // 3. Get target platforms
    const { data: platforms } = await supabase
        .from('social_platforms')
        .select('*')
        .in('id', post.platform_ids || [])
        .eq('is_active', true);

    if (!platforms || platforms.length === 0) {
        await supabase.from('social_posts').update({
            status: 'failed',
            publish_errors: { message: 'Brak aktywnych platform' },
        }).eq('id', postId);
        throw new Error('Brak aktywnych platform do publikacji');
    }

    // 4. Publish to each platform
    const results: PublishResult[] = [];

    for (const platform of platforms) {
        let result: PublishResult;

        switch (platform.platform) {
            case 'facebook':
                result = await publishToFacebook(platform, post.text_content || '', post.hashtags || [], post.image_url, post.video_url);
                break;
            case 'instagram':
                result = await publishToInstagram(platform, post.text_content || '', post.hashtags || [], post.image_url, post.video_url);
                break;
            case 'tiktok':
                result = await publishToTikTok(platform, post.text_content || '', post.hashtags || [], post.video_url);
                break;
            case 'youtube':
                result = await publishToYouTube(platform, post.text_content || '', post.hashtags || [], post.video_url, post.text_content?.substring(0, 100));
                break;
            default:
                result = { platform: platform.platform, platform_id: platform.id, success: false, error: 'Nieobsługiwana platforma' };
        }

        results.push(result);
    }

    // 5. Update post status
    const allSuccess = results.every(r => r.success);
    const anySuccess = results.some(r => r.success);
    const platformPostIds: Record<string, string> = {};
    const publishErrors: Record<string, string> = {};

    for (const r of results) {
        if (r.success && r.post_id) platformPostIds[r.platform] = r.post_id;
        if (!r.success && r.error) publishErrors[r.platform] = r.error;
    }

    await supabase.from('social_posts').update({
        status: allSuccess ? 'published' : anySuccess ? 'published' : 'failed',
        published_at: anySuccess ? new Date().toISOString() : null,
        platform_post_ids: Object.keys(platformPostIds).length > 0 ? platformPostIds : null,
        publish_errors: Object.keys(publishErrors).length > 0 ? publishErrors : null,
    }).eq('id', postId);

    return results;
}

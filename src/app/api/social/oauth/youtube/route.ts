/**
 * YouTube/Google OAuth Flow
 * 
 * GET  /api/social/oauth/youtube — redirects to Google consent screen
 * GET  /api/social/oauth/youtube?code=... — callback, exchanges code for token
 * 
 * Scopes: youtube.upload, youtube.force-ssl
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl')}/api/social/oauth/youtube`;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const platformId = searchParams.get('state');

    if (error) {
        console.error('[YT OAuth] Error:', error);
        return NextResponse.redirect(new URL('/admin?tab=social-media&oauth=error', req.url));
    }

    // Step 1: Redirect to Google consent screen
    if (!code) {
        const state = searchParams.get('platform_id') || '';
        const scopes = [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            'https://www.googleapis.com/auth/youtube.readonly',
        ].join(' ');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&access_type=offline` +
            `&prompt=consent` +
            `&state=${state}`;

        return NextResponse.redirect(authUrl);
    }

    // Step 2: Exchange code for tokens
    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
        }

        const { access_token, refresh_token, expires_in } = tokenData;
        const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

        // Step 3: Get channel info
        const channelRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
            { headers: { 'Authorization': `Bearer ${access_token}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];

        // Step 4: Save to DB
        const updateData: any = {
            access_token,
            refresh_token: refresh_token || undefined,
            token_expires_at: tokenExpiry,
            config: {
                channel_id: channel?.id,
                channel_title: channel?.snippet?.title,
                channel_thumbnail: channel?.snippet?.thumbnails?.default?.url,
            },
        };
        if (channel?.id) updateData.account_id = channel.id;

        // Update specific platform or all YouTube platforms
        if (platformId) {
            await supabase
                .from('social_platforms')
                .update(updateData)
                .eq('id', platformId);
        } else {
            const { data: ytPlatforms } = await supabase
                .from('social_platforms')
                .select('id')
                .eq('platform', 'youtube');

            for (const plat of (ytPlatforms || [])) {
                await supabase
                    .from('social_platforms')
                    .update(updateData)
                    .eq('id', plat.id);
            }
        }

        console.log(`[YT OAuth] Success: channel ${channel?.snippet?.title || 'unknown'}`);

        return NextResponse.redirect(
            new URL(`/admin?tab=social-media&oauth=success&channel=${encodeURIComponent(channel?.snippet?.title || '')}`, req.url)
        );
    } catch (err: any) {
        console.error('[YT OAuth] Error:', err);
        return NextResponse.redirect(new URL('/admin?tab=social-media&oauth=error', req.url));
    }
}

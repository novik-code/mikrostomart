/**
 * TikTok OAuth Flow
 * 
 * GET  /api/social/oauth/tiktok — redirects to TikTok authorization
 * GET  /api/social/oauth/tiktok?code=... — callback, exchanges code for token
 * 
 * Scopes: user.info.basic, video.publish, video.upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mikrostomart.pl'}/api/social/oauth/tiktok`;
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const platformId = searchParams.get('state');

    if (error) {
        console.error('[TT OAuth] Error:', error, searchParams.get('error_description'));
        return NextResponse.redirect(new URL('/admin?tab=social-media&oauth=error', req.url));
    }

    // Step 1: Redirect to TikTok authorization
    if (!code) {
        const state = searchParams.get('platform_id') || '';
        const scopes = 'user.info.basic,video.publish,video.upload';

        // TikTok Login Kit v2 uses /v2/auth/authorize/
        const authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${CLIENT_KEY}` +
            `&response_type=code` +
            `&scope=${scopes}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${state}`;

        return NextResponse.redirect(authUrl);
    }

    // Step 2: Exchange code for tokens
    try {
        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: CLIENT_KEY,
                client_secret: CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            }),
        });

        const tokenData = await tokenRes.json();
        if (tokenData.error || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
        }

        const { access_token, refresh_token, expires_in, open_id } = tokenData;
        const tokenExpiry = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString();

        // Step 3: Get user info
        let userInfo: any = {};
        try {
            const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,username', {
                headers: { 'Authorization': `Bearer ${access_token}` },
            });
            const userData = await userRes.json();
            userInfo = userData.data?.user || {};
        } catch { /* optional */ }

        // Step 4: Save to DB
        const updateData: any = {
            access_token,
            refresh_token: refresh_token || undefined,
            token_expires_at: tokenExpiry,
            account_id: open_id,
            config: {
                open_id,
                display_name: userInfo.display_name,
                username: userInfo.username,
                avatar_url: userInfo.avatar_url,
            },
        };

        if (platformId) {
            await supabase
                .from('social_platforms')
                .update(updateData)
                .eq('id', platformId);
        } else {
            const { data: ttPlatforms } = await supabase
                .from('social_platforms')
                .select('id')
                .eq('platform', 'tiktok');

            for (const plat of (ttPlatforms || [])) {
                await supabase
                    .from('social_platforms')
                    .update(updateData)
                    .eq('id', plat.id);
            }
        }

        console.log(`[TT OAuth] Success: ${userInfo.display_name || open_id}`);

        return NextResponse.redirect(
            new URL(`/admin?tab=social-media&oauth=success&tiktok=${encodeURIComponent(userInfo.display_name || '')}`, req.url)
        );
    } catch (err: any) {
        console.error('[TT OAuth] Error:', err);
        return NextResponse.redirect(new URL('/admin?tab=social-media&oauth=error', req.url));
    }
}

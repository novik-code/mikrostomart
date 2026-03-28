/**
 * GET /api/social/debug-tiktok
 * 
 * Diagnostic: checks TikTok token validity, queries creator_info,
 * and attempts a dry-run init to show exact error responses.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';

export async function GET() {
    const results: any = { steps: [] };

    try {
        // 1. Get TikTok platform from DB
        const { data: ttPlatform } = await supabase
            .from('social_platforms')
            .select('*')
            .eq('platform', 'tiktok')
            .single();

        if (!ttPlatform) {
            return NextResponse.json({ error: 'No TikTok platform found' }, { status: 404 });
        }

        results.platform = {
            id: ttPlatform.id,
            account_name: ttPlatform.account_name,
            account_id: ttPlatform.account_id,
            has_token: !!ttPlatform.access_token,
            has_refresh: !!ttPlatform.refresh_token,
            token_expires: ttPlatform.token_expires_at,
            token_expired: ttPlatform.token_expires_at ? new Date(ttPlatform.token_expires_at) < new Date() : null,
            config: ttPlatform.config,
        };

        let token = ttPlatform.access_token;

        // 2. Try refresh if expired
        if (results.platform.token_expired && ttPlatform.refresh_token) {
            results.steps.push({ step: 'Token expired, attempting refresh...' });
            try {
                const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_key: CLIENT_KEY,
                        client_secret: CLIENT_SECRET,
                        grant_type: 'refresh_token',
                        refresh_token: ttPlatform.refresh_token,
                    }),
                });
                const refreshData = await refreshRes.json();
                results.steps.push({ step: 'Refresh response', data: refreshData });

                if (refreshData.access_token) {
                    token = refreshData.access_token;
                    // Save new token
                    await supabase.from('social_platforms').update({
                        access_token: refreshData.access_token,
                        refresh_token: refreshData.refresh_token || ttPlatform.refresh_token,
                        token_expires_at: new Date(Date.now() + (refreshData.expires_in || 86400) * 1000).toISOString(),
                    }).eq('id', ttPlatform.id);
                    results.steps.push({ step: 'Token refreshed and saved' });
                }
            } catch (e: any) {
                results.steps.push({ step: 'Refresh failed', error: e.message });
            }
        }

        // 3. Query creator_info
        try {
            const creatorRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({}),
            });
            const creatorText = await creatorRes.text();
            let creatorData: any;
            try { creatorData = JSON.parse(creatorText); } catch { creatorData = creatorText; }
            results.steps.push({
                step: 'creator_info/query',
                status: creatorRes.status,
                data: creatorData,
            });
        } catch (e: any) {
            results.steps.push({ step: 'creator_info failed', error: e.message });
        }

        // 4. Try init with a small fake video (just to see the error)
        try {
            const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    post_info: {
                        title: 'Test video #test',
                        privacy_level: 'SELF_ONLY',
                        disable_duet: false,
                        disable_comment: false,
                        disable_stitch: false,
                        brand_content_toggle: false,
                        brand_organic_toggle: false,
                    },
                    source_info: {
                        source: 'FILE_UPLOAD',
                        video_size: 1000000,
                        chunk_size: 1000000,
                        total_chunk_count: 1,
                    },
                }),
            });
            const initText = await initRes.text();
            let initData: any;
            try { initData = JSON.parse(initText); } catch { initData = initText; }
            results.steps.push({
                step: 'video/init (test)',
                status: initRes.status,
                data: initData,
            });
        } catch (e: any) {
            results.steps.push({ step: 'video/init failed', error: e.message });
        }

        return NextResponse.json(results);
    } catch (err: any) {
        return NextResponse.json({ error: err.message, results }, { status: 500 });
    }
}

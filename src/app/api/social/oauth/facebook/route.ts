/**
 * Facebook/Instagram OAuth Flow
 * 
 * GET  /api/social/oauth/facebook — redirects to Facebook Login Dialog
 * GET  /api/social/oauth/facebook?code=... — callback, exchanges code for token
 * 
 * Scopes: pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl')}/api/social/oauth/facebook`;
const APP_ID = process.env.META_APP_ID!;
const APP_SECRET = process.env.META_APP_SECRET!;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const platformId = searchParams.get('state'); // Pass platform_id as state

    // If error returned from Facebook
    if (error) {
        console.error('[FB OAuth] Error:', error, searchParams.get('error_description'));
        return NextResponse.redirect(new URL('/admin?tab=social-media&oauth=error', req.url));
    }

    // Step 1: Redirect to Facebook Login Dialog
    if (!code) {
        const state = searchParams.get('platform_id') || '';
        const scopes = [
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_show_list',
            'instagram_basic',
            'instagram_content_publish',
        ].join(',');

        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
            `client_id=${APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${state}` +
            `&scope=${scopes}` +
            `&response_type=code`;

        return NextResponse.redirect(authUrl);
    }

    // Step 2: Exchange code for short-lived token
    try {
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
            `client_id=${APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&client_secret=${APP_SECRET}` +
            `&code=${code}`;

        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || tokenData.error) {
            throw new Error(tokenData.error?.message || 'Token exchange failed');
        }

        const shortLivedToken = tokenData.access_token;

        // Step 3: Exchange for long-lived token (60 days)
        const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
            `grant_type=fb_exchange_token` +
            `&client_id=${APP_ID}` +
            `&client_secret=${APP_SECRET}` +
            `&fb_exchange_token=${shortLivedToken}`;

        const longRes = await fetch(longLivedUrl);
        const longData = await longRes.json();
        const longLivedToken = longData.access_token || shortLivedToken;
        const expiresIn = longData.expires_in || 5184000; // ~60 days

        // Step 4: Get user pages (for Page Access Token) — include link/username for matching
        const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,link,username&access_token=${longLivedToken}`);
        const pagesData = await pagesRes.json();
        const pages = pagesData.data || [];
        console.log(`[FB OAuth] Found ${pages.length} pages: ${pages.map((p: any) => `${p.name} (${p.id}, username=${p.username || '?'})`).join(', ')}`);

        // Step 5: Get Instagram business accounts linked to pages
        const igAccounts: any[] = [];
        for (const page of pages) {
            try {
                const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`);
                const igData = await igRes.json();
                if (igData.instagram_business_account) {
                    igAccounts.push({
                        ig_id: igData.instagram_business_account.id,
                        ig_username: igData.instagram_business_account.username,
                        page_id: page.id,
                        page_name: page.name,
                        page_token: page.access_token,
                    });
                }
            } catch { /* skip pages without IG */ }
        }
        console.log(`[FB OAuth] Found ${igAccounts.length} IG accounts: ${igAccounts.map((a: any) => `@${a.ig_username} (${a.ig_id})`).join(', ')}`);

        // Step 6: Save tokens to DB
        const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Helper: check if a platform's account_url or account_name matches a page
        const matchPage = (plat: any, page: any) => {
            const url = (plat.account_url || '').toLowerCase();
            const name = (plat.account_name || '').toLowerCase();
            const pageUsername = (page.username || '').toLowerCase();
            const pageLink = (page.link || '').toLowerCase();
            const pageName = (page.name || '').toLowerCase();
            // Match by: account_url contains page username, OR page link contains account_name
            if (pageUsername && (url.includes(pageUsername) || name === pageUsername)) return true;
            if (pageLink && url && (pageLink.includes(name) || url.includes(pageUsername))) return true;
            if (pageName && (pageName.includes(name) || name.includes(pageName))) return true;
            return false;
        };

        const matchIg = (plat: any, ig: any) => {
            const url = (plat.account_url || '').toLowerCase();
            const name = (plat.account_name || '').toLowerCase();
            const igUser = (ig.ig_username || '').toLowerCase();
            if (igUser && (url.includes(igUser) || name === igUser)) return true;
            // Also match without underscores (nowosielski_marcin vs nowosielskimarcin)
            if (igUser && name.replace(/_/g, '') === igUser.replace(/_/g, '')) return true;
            return false;
        };

        // Update all Facebook/Instagram platforms — MATCH by account_url
        const { data: fbPlatforms } = await supabase
            .from('social_platforms')
            .select('id, platform, account_name, account_url')
            .in('platform', ['facebook', 'instagram']);

        for (const plat of (fbPlatforms || [])) {
            if (plat.platform === 'facebook') {
                const matched = pages.find((p: any) => matchPage(plat, p)) || pages[0];
                if (matched) {
                    console.log(`[FB OAuth] FB '${plat.account_name}' (${plat.account_url}) → page '${matched.name}' (${matched.id}, @${matched.username || '?'})`);
                    await supabase
                        .from('social_platforms')
                        .update({
                            access_token: matched.access_token,
                            token_expires_at: tokenExpiry,
                            account_id: matched.id,
                            config: { pages, user_token: longLivedToken },
                        })
                        .eq('id', plat.id);
                }
            } else if (plat.platform === 'instagram') {
                const matched = igAccounts.find((ig: any) => matchIg(plat, ig)) || igAccounts[0];
                if (matched) {
                    console.log(`[FB OAuth] IG '${plat.account_name}' (${plat.account_url}) → @${matched.ig_username} (${matched.ig_id})`);
                    await supabase
                        .from('social_platforms')
                        .update({
                            access_token: matched.page_token,
                            token_expires_at: tokenExpiry,
                            account_id: matched.ig_id,
                            config: { ig_username: matched.ig_username, page_id: matched.page_id, page_name: matched.page_name },
                        })
                        .eq('id', plat.id);
                }
            }
        }

        // If we have a specific platformId from state, update that too
        if (platformId) {
            const targetPlat = (fbPlatforms || []).find((p: any) => p.id === platformId);
            if (targetPlat?.platform === 'instagram' && igAccounts.length > 0) {
                const ig = igAccounts.find((a: any) => matchIg(targetPlat, a)) || igAccounts[0];
                await supabase.from('social_platforms').update({
                    access_token: ig.page_token, token_expires_at: tokenExpiry,
                    account_id: ig.ig_id,
                    config: { ig_username: ig.ig_username, page_id: ig.page_id, page_name: ig.page_name },
                }).eq('id', platformId);
            } else if (targetPlat?.platform === 'facebook' && pages.length > 0) {
                const page = pages.find((p: any) => matchPage(targetPlat, p)) || pages[0];
                await supabase.from('social_platforms').update({
                    access_token: page.access_token, token_expires_at: tokenExpiry,
                    account_id: page.id,
                    config: { pages, igAccounts, user_token: longLivedToken },
                }).eq('id', platformId);
            }
        }

        console.log(`[FB OAuth] Success: ${pages.length} pages, ${igAccounts.length} IG accounts`);

        return NextResponse.redirect(
            new URL(`/admin?tab=social-media&oauth=success&pages=${pages.length}&ig=${igAccounts.length}`, req.url)
        );
    } catch (err: any) {
        console.error('[FB OAuth] Error:', err);
        return NextResponse.redirect(new URL('/admin?tab=social-media&oauth=error', req.url));
    }
}

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

        // Step 4: Get user pages (for Page Access Token)
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`);
        const pagesData = await pagesRes.json();
        const pages = pagesData.data || [];

        // Step 5: Get Instagram business accounts linked to pages
        const igAccounts: any[] = [];
        for (const page of pages) {
            try {
                const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`);
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

        // Step 6: Save tokens to DB
        const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Update all Facebook/Instagram platforms — MATCH by account_name
        const { data: fbPlatforms } = await supabase
            .from('social_platforms')
            .select('id, platform, account_name')
            .in('platform', ['facebook', 'instagram']);

        for (const plat of (fbPlatforms || [])) {
            if (plat.platform === 'facebook') {
                // Match page by name (case-insensitive partial match)
                const matchedPage = pages.find((p: any) => 
                    plat.account_name && (
                        p.name?.toLowerCase().includes(plat.account_name.toLowerCase()) ||
                        plat.account_name.toLowerCase().includes(p.name?.toLowerCase())
                    )
                ) || pages[0]; // fallback to first page
                
                if (matchedPage) {
                    console.log(`[FB OAuth] Matching FB platform '${plat.account_name}' → page '${matchedPage.name}' (${matchedPage.id})`);
                    await supabase
                        .from('social_platforms')
                        .update({
                            access_token: matchedPage.access_token,
                            token_expires_at: tokenExpiry,
                            account_id: matchedPage.id,
                            config: { pages, user_token: longLivedToken },
                        })
                        .eq('id', plat.id);
                }
            } else if (plat.platform === 'instagram') {
                // Match IG account by username (case-insensitive)
                const matchedIg = igAccounts.find((ig: any) => 
                    plat.account_name && (
                        ig.ig_username?.toLowerCase() === plat.account_name.toLowerCase() ||
                        ig.ig_username?.toLowerCase().replace(/_/g, '') === plat.account_name.toLowerCase().replace(/_/g, '')
                    )
                ) || igAccounts[0]; // fallback to first IG account
                
                if (matchedIg) {
                    console.log(`[FB OAuth] Matching IG platform '${plat.account_name}' → @${matchedIg.ig_username} (${matchedIg.ig_id})`);
                    await supabase
                        .from('social_platforms')
                        .update({
                            access_token: matchedIg.page_token,
                            token_expires_at: tokenExpiry,
                            account_id: matchedIg.ig_id,
                            config: { ig_username: matchedIg.ig_username, page_id: matchedIg.page_id, page_name: matchedIg.page_name },
                        })
                        .eq('id', plat.id);
                }
            }
        }

        // If we have a specific platformId from state, update that too
        if (platformId) {
            // Check if it's an IG platform
            const targetPlat = (fbPlatforms || []).find((p: any) => p.id === platformId);
            if (targetPlat?.platform === 'instagram' && igAccounts.length > 0) {
                const ig = igAccounts.find((a: any) => 
                    targetPlat.account_name && a.ig_username?.toLowerCase().includes(targetPlat.account_name.toLowerCase())
                ) || igAccounts[0];
                await supabase
                    .from('social_platforms')
                    .update({
                        access_token: ig.page_token,
                        token_expires_at: tokenExpiry,
                        account_id: ig.ig_id,
                        config: { ig_username: ig.ig_username, page_id: ig.page_id, page_name: ig.page_name },
                    })
                    .eq('id', platformId);
            } else {
                const page = pages.find((p: any) => 
                    targetPlat?.account_name && p.name?.toLowerCase().includes(targetPlat.account_name.toLowerCase())
                ) || pages[0];
                if (page) {
                    await supabase
                        .from('social_platforms')
                        .update({
                            access_token: page.access_token,
                            token_expires_at: tokenExpiry,
                            account_id: page.id,
                            config: { pages, igAccounts, user_token: longLivedToken },
                        })
                        .eq('id', platformId);
                }
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

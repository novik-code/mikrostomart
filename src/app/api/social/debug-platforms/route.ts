/**
 * GET /api/social/debug-platforms
 * 
 * Diagnostic endpoint: uses stored tokens to discover all FB pages
 * and IG business accounts the user has access to.
 * Returns raw data for debugging platform mapping issues.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        // Get all platforms from DB
        const { data: platforms } = await supabase
            .from('social_platforms')
            .select('*')
            .order('platform');

        // Find a FB platform with a user_token in config
        const fbPlatform = (platforms || []).find(
            (p: any) => p.platform === 'facebook' && p.config?.user_token
        );

        let discoveredPages: any[] = [];
        let discoveredIgAccounts: any[] = [];

        if (fbPlatform?.config?.user_token) {
            const userToken = fbPlatform.config.user_token;

            // Discover all pages
            const pagesRes = await fetch(
                `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,link,username,category&access_token=${userToken}`
            );
            const pagesData = await pagesRes.json();
            discoveredPages = (pagesData.data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                username: p.username || null,
                link: p.link || null,
                category: p.category || null,
            }));

            // Discover IG accounts linked to each page
            for (const page of pagesData.data || []) {
                try {
                    const igRes = await fetch(
                        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${page.access_token}`
                    );
                    const igData = await igRes.json();
                    if (igData.instagram_business_account) {
                        discoveredIgAccounts.push({
                            ig_id: igData.instagram_business_account.id,
                            ig_username: igData.instagram_business_account.username,
                            ig_name: igData.instagram_business_account.name,
                            linked_to_page: page.name,
                            linked_to_page_id: page.id,
                        });
                    }
                } catch {}
            }
        }

        return NextResponse.json({
            stored_platforms: (platforms || []).map((p: any) => ({
                id: p.id,
                platform: p.platform,
                account_name: p.account_name,
                account_url: p.account_url,
                account_id: p.account_id,
                content_type: p.content_type,
                has_token: !!p.access_token,
                token_expires: p.token_expires_at,
            })),
            discovered_fb_pages: discoveredPages,
            discovered_ig_accounts: discoveredIgAccounts,
            notes: {
                message: 'Compare stored account_ids with discovered page/IG IDs to fix mismatches',
                fb_pages_count: discoveredPages.length,
                ig_accounts_count: discoveredIgAccounts.length,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

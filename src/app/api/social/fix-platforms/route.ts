/**
 * POST /api/social/fix-platforms
 * 
 * Auto-fixes FB/IG platform account_ids and tokens by re-discovering
 * pages via stored user_token and matching by account_url/username.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
    const fixes: any[] = [];

    try {
        // 1. Get all platforms
        const { data: platforms } = await supabase
            .from('social_platforms')
            .select('*');

        // 2. Find user_token from any FB platform config
        const fbWithToken = (platforms || []).find(
            (p: any) => p.platform === 'facebook' && p.config?.user_token
        );
        if (!fbWithToken?.config?.user_token) {
            return NextResponse.json({ error: 'No Facebook user_token found. Re-authorize first.' }, { status: 400 });
        }
        const userToken = fbWithToken.config.user_token;

        // 3. Discover all pages with full fields
        const pagesRes = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,link,username&access_token=${userToken}`
        );
        const pagesData = await pagesRes.json();
        const pages = pagesData.data || [];
        console.log(`[FixPlatforms] Found ${pages.length} pages`);

        // 4. Discover all IG business accounts
        const igAccounts: any[] = [];
        for (const page of pages) {
            try {
                const igRes = await fetch(
                    `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`
                );
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
            } catch {}
        }
        console.log(`[FixPlatforms] Found ${igAccounts.length} IG accounts`);

        // 5. Fix each FB platform
        const fbPlatforms = (platforms || []).filter((p: any) => p.platform === 'facebook');
        for (const plat of fbPlatforms) {
            const url = (plat.account_url || '').toLowerCase();
            const name = (plat.account_name || '').toLowerCase();

            // Find matching page by username first, then by name
            const matched = pages.find((p: any) => {
                const pu = (p.username || '').toLowerCase();
                const pn = (p.name || '').toLowerCase();
                if (pu && (url.includes(pu) || name === pu)) return true;
                if (pn === name || pn.includes(name) || name.includes(pn)) return true;
                return false;
            });

            if (matched && matched.id !== plat.account_id) {
                await supabase.from('social_platforms').update({
                    account_id: matched.id,
                    access_token: matched.access_token,
                }).eq('id', plat.id);

                fixes.push({
                    platform: 'facebook',
                    account_name: plat.account_name,
                    old_id: plat.account_id,
                    new_id: matched.id,
                    matched_page: matched.name,
                    matched_username: matched.username,
                });
            } else if (matched) {
                // Also fix the token even if ID matches
                await supabase.from('social_platforms').update({
                    access_token: matched.access_token,
                }).eq('id', plat.id);

                fixes.push({
                    platform: 'facebook',
                    account_name: plat.account_name,
                    status: 'ID correct, token refreshed',
                    id: matched.id,
                    matched_page: matched.name,
                });
            } else {
                fixes.push({
                    platform: 'facebook',
                    account_name: plat.account_name,
                    status: 'NO MATCH FOUND',
                    current_id: plat.account_id,
                });
            }
        }

        // 6. Fix each IG platform
        const igPlatforms = (platforms || []).filter((p: any) => p.platform === 'instagram');
        for (const plat of igPlatforms) {
            const url = (plat.account_url || '').toLowerCase();
            const name = (plat.account_name || '').toLowerCase();

            const matched = igAccounts.find((ig: any) => {
                const iu = (ig.ig_username || '').toLowerCase();
                if (url.includes(iu) || name === iu) return true;
                if (name.replace(/_/g, '') === iu.replace(/_/g, '')) return true;
                return false;
            });

            if (matched && matched.ig_id !== plat.account_id) {
                await supabase.from('social_platforms').update({
                    account_id: matched.ig_id,
                    access_token: matched.page_token,
                }).eq('id', plat.id);

                fixes.push({
                    platform: 'instagram',
                    account_name: plat.account_name,
                    old_id: plat.account_id,
                    new_id: matched.ig_id,
                    matched_ig: matched.ig_username,
                });
            } else if (matched) {
                await supabase.from('social_platforms').update({
                    access_token: matched.page_token,
                }).eq('id', plat.id);

                fixes.push({
                    platform: 'instagram',
                    account_name: plat.account_name,
                    status: 'ID correct, token refreshed',
                    id: matched.ig_id,
                    matched_ig: matched.ig_username,
                });
            } else {
                fixes.push({
                    platform: 'instagram',
                    account_name: plat.account_name,
                    status: 'NO MATCH FOUND',
                    current_id: plat.account_id,
                });
            }
        }

        return NextResponse.json({
            success: true,
            fixes,
            discovered: {
                fb_pages: pages.map((p: any) => ({ id: p.id, name: p.name, username: p.username })),
                ig_accounts: igAccounts.map((a: any) => ({ ig_id: a.ig_id, ig_username: a.ig_username })),
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message, fixes }, { status: 500 });
    }
}

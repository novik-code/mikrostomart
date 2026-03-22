/**
 * Social Media Comment Management Service
 *
 * Fetches comments from published posts, generates AI replies via GPT-4o,
 * and publishes approved replies back to the platform.
 *
 * Supported platforms: Facebook, Instagram, YouTube
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Types ──────────────────────────────────────────────────────────

export interface FetchedComment {
    comment_id: string;
    text: string;
    author: string;
    date: string; // ISO
}

export interface CommentReplyRow {
    id: string;
    post_id: string;
    platform: string;
    platform_post_id: string;
    comment_id: string;
    comment_text: string;
    comment_author: string;
    comment_date: string;
    reply_text: string;
    reply_id: string | null;
    status: string;
    ai_model: string | null;
    published_at: string | null;
    created_at: string;
}

// ── Token helpers (reuse from socialPublish.ts) ────────────────────

async function getValidToken(platform: any): Promise<string | null> {
    let token = platform.access_token;
    if (!token) return null;

    // Google/YouTube: auto-refresh expired tokens
    if (
        platform.platform === 'youtube' &&
        platform.token_expires_at &&
        new Date(platform.token_expires_at) < new Date() &&
        platform.refresh_token
    ) {
        try {
            const res = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: platform.refresh_token,
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
                    .eq('id', platform.id);
                token = data.access_token;
            }
        } catch (err) {
            console.error('[Comments] Failed to refresh YouTube token:', err);
        }
    }

    return token;
}

// ═══════════════════════════════════════════════════════════════════
// 1. FETCH COMMENTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch comments from a single platform for a given post.
 * Returns only NEW comments (not yet in social_comment_replies).
 */
export async function fetchCommentsForPost(
    postId: string,
    platform: string,
    platformPostId: string,
    accessToken: string,
    accountId?: string,
): Promise<FetchedComment[]> {
    let rawComments: FetchedComment[] = [];

    try {
        switch (platform) {
            case 'facebook':
                rawComments = await fetchFacebookComments(platformPostId, accessToken);
                break;
            case 'instagram':
                rawComments = await fetchInstagramComments(platformPostId, accessToken, accountId);
                break;
            case 'youtube':
                rawComments = await fetchYouTubeComments(platformPostId, accessToken);
                break;
        }
    } catch (err: any) {
        console.error(`[Comments] Error fetching ${platform} comments for ${platformPostId}:`, err.message);
        return [];
    }

    if (rawComments.length === 0) return [];

    // Filter out already-tracked comments
    const commentIds = rawComments.map((c) => c.comment_id);
    const { data: existing } = await supabase
        .from('social_comment_replies')
        .select('comment_id')
        .eq('platform', platform)
        .in('comment_id', commentIds);

    const existingIds = new Set((existing || []).map((e: any) => e.comment_id));
    return rawComments.filter((c) => !existingIds.has(c.comment_id));
}

// ── Facebook comments ──────────────────────────────────────────────

async function fetchFacebookComments(postId: string, token: string): Promise<FetchedComment[]> {
    const url = `https://graph.facebook.com/v19.0/${postId}/comments?fields=id,message,from,created_time&limit=50&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.data) return [];

    return data.data
        .filter((c: any) => c.message && c.message.trim())
        .map((c: any) => ({
            comment_id: c.id,
            text: c.message,
            author: c.from?.name || 'Użytkownik Facebook',
            date: c.created_time || new Date().toISOString(),
        }));
}

// ── Instagram comments ─────────────────────────────────────────────

async function fetchInstagramComments(
    mediaId: string,
    token: string,
    accountId?: string,
): Promise<FetchedComment[]> {
    const url = `https://graph.facebook.com/v19.0/${mediaId}/comments?fields=id,text,username,timestamp&limit=50&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.data) return [];

    // Filter out own comments (our IG username)
    const ownUsername = accountId ? await getIgUsername(accountId, token) : null;

    return data.data
        .filter((c: any) => {
            if (!c.text || !c.text.trim()) return false;
            if (ownUsername && c.username === ownUsername) return false;
            return true;
        })
        .map((c: any) => ({
            comment_id: c.id,
            text: c.text,
            author: c.username || 'Użytkownik Instagram',
            date: c.timestamp || new Date().toISOString(),
        }));
}

async function getIgUsername(igId: string, token: string): Promise<string | null> {
    try {
        const res = await fetch(
            `https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${token}`,
        );
        const data = await res.json();
        return data.username || null;
    } catch {
        return null;
    }
}

// ── YouTube comments ───────────────────────────────────────────────

async function fetchYouTubeComments(videoId: string, token: string): Promise<FetchedComment[]> {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=time`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    if (!data.items) return [];

    return data.items
        .filter((item: any) => {
            const snippet = item.snippet?.topLevelComment?.snippet;
            return snippet?.textOriginal && snippet.textOriginal.trim();
        })
        .map((item: any) => {
            const snippet = item.snippet.topLevelComment.snippet;
            return {
                comment_id: item.snippet.topLevelComment.id,
                text: snippet.textOriginal,
                author: snippet.authorDisplayName || 'Użytkownik YouTube',
                date: snippet.publishedAt || new Date().toISOString(),
            };
        });
}

// ═══════════════════════════════════════════════════════════════════
// 2. AI REPLY GENERATION
// ═══════════════════════════════════════════════════════════════════

export async function generateCommentReply(
    comment: FetchedComment,
    platform: string,
    postContext: string,
): Promise<string> {
    const model = process.env.SOCIAL_AI_MODEL || 'gpt-4o';
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `Jesteś Marcinem Nowosielskim — dentystą z Opola, prowadzącym klinikę Mikrostomart.
Odpowiadasz na komentarze pod swoimi postami w mediach społecznościowych.

ZASADY:
- Pisz w PIERWSZEJ OSOBIE (ja, mój gabinet)
- Ton: ciepły, profesjonalny, przyjazny — jak rozmowa z pacjentem
- Odpowiedź KRÓTKA: 1-3 zdania (max 200 znaków)
- Po polsku
- NIE używaj hashtagów w odpowiedzi
- NIE powtarzaj treści komentarza dosłownie
- Jeśli komentarz jest pozytywny: podziękuj i dodaj coś merytorycznego lub ciepłego
- Jeśli komentarz to pytanie: odpowiedz konkretnie, zachęć do kontaktu/wizyty
- Jeśli komentarz jest neutralny/emoji: krótkie podziękowanie
- Jeśli komentarz jest negatywny: zachowaj profesjonalizm, zaproponuj kontakt prywatny
- Jeśli komentarz to spam/nieistotny: odpowiedz "SKIP" (dokładnie to słowo)
- Dodaj emoji: 1-2 pasujące emoji

KONTEKST POSTA (na który jest komentarz):
${postContext}

PLATFORMA: ${platform}

Odpowiedz WYŁĄCZNIE tekstem odpowiedzi (bez cudzysłowów, bez JSON, bez wyjaśnień).
Jeśli komentarz to spam — odpowiedz dokładnie: SKIP`;

    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Komentarz od @${comment.author}: "${comment.text}"` },
        ],
        temperature: 0.7,
        max_tokens: 256,
    });

    const reply = completion.choices[0].message.content?.trim() || '';
    return reply;
}

// ═══════════════════════════════════════════════════════════════════
// 3. PUBLISH REPLY
// ═══════════════════════════════════════════════════════════════════

export async function publishReply(
    replyRow: CommentReplyRow,
): Promise<{ success: boolean; reply_id?: string; error?: string }> {
    // Get platform credentials
    const { data: platforms } = await supabase
        .from('social_platforms')
        .select('*')
        .eq('platform', replyRow.platform)
        .eq('is_active', true)
        .limit(1);

    const platform = platforms?.[0];
    if (!platform) return { success: false, error: 'Brak aktywnej platformy' };

    const token = await getValidToken(platform);
    if (!token) return { success: false, error: 'Brak tokenu — podłącz konto OAuth' };

    try {
        let replyId: string | undefined;

        switch (replyRow.platform) {
            case 'facebook':
                replyId = await publishFacebookReply(replyRow.comment_id, replyRow.reply_text, token);
                break;
            case 'instagram':
                replyId = await publishInstagramReply(replyRow.comment_id, replyRow.reply_text, token);
                break;
            case 'youtube':
                replyId = await publishYouTubeReply(replyRow.comment_id, replyRow.reply_text, token);
                break;
            default:
                return { success: false, error: `Nieobsługiwana platforma: ${replyRow.platform}` };
        }

        // Update DB
        await supabase
            .from('social_comment_replies')
            .update({
                reply_id: replyId || null,
                status: 'published',
                published_at: new Date().toISOString(),
            })
            .eq('id', replyRow.id);

        return { success: true, reply_id: replyId };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ── Facebook reply ─────────────────────────────────────────────────

async function publishFacebookReply(commentId: string, message: string, token: string): Promise<string> {
    const res = await fetch(`https://graph.facebook.com/v19.0/${commentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
}

// ── Instagram reply ────────────────────────────────────────────────

async function publishInstagramReply(commentId: string, message: string, token: string): Promise<string> {
    const res = await fetch(`https://graph.facebook.com/v19.0/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
}

// ── YouTube reply ──────────────────────────────────────────────────

async function publishYouTubeReply(commentId: string, text: string, token: string): Promise<string> {
    const res = await fetch(
        'https://www.googleapis.com/youtube/v3/comments?part=snippet',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                snippet: {
                    parentId: commentId,
                    textOriginal: text,
                },
            }),
        },
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.id;
}

// ═══════════════════════════════════════════════════════════════════
// 4. ORCHESTRATION — fetch + generate for all recent posts
// ═══════════════════════════════════════════════════════════════════

export async function processNewComments(): Promise<{
    fetched: number;
    generated: number;
    skipped: number;
    errors: string[];
}> {
    const result = { fetched: 0, generated: 0, skipped: 0, errors: [] as string[] };

    // Get posts published in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts } = await supabase
        .from('social_posts')
        .select('id, text_content, platform_post_ids, platform_ids')
        .eq('status', 'published')
        .gte('published_at', sevenDaysAgo);

    if (!posts || posts.length === 0) return result;

    // Get all active platforms
    const { data: allPlatforms } = await supabase
        .from('social_platforms')
        .select('*')
        .eq('is_active', true);

    if (!allPlatforms || allPlatforms.length === 0) return result;

    const platformMap = new Map(allPlatforms.map((p: any) => [p.id, p]));

    for (const post of posts) {
        const platformPostIds = post.platform_post_ids || {};

        for (const [platformName, platformPostId] of Object.entries(platformPostIds)) {
            if (!platformPostId) continue;

            // Find matching platform credentials
            const matchingPlatform = allPlatforms.find(
                (p: any) => p.platform === platformName && p.is_active,
            );
            if (!matchingPlatform) continue;

            const token = await getValidToken(matchingPlatform);
            if (!token) {
                result.errors.push(`Brak tokenu dla ${platformName}`);
                continue;
            }

            // Fetch new comments
            const newComments = await fetchCommentsForPost(
                post.id,
                platformName,
                platformPostId as string,
                token,
                matchingPlatform.account_id,
            );

            result.fetched += newComments.length;

            // Generate AI reply for each comment
            for (const comment of newComments) {
                try {
                    const aiModel = process.env.SOCIAL_AI_MODEL || 'gpt-4o';
                    const replyText = await generateCommentReply(
                        comment,
                        platformName,
                        post.text_content || '',
                    );

                    // Check if AI said SKIP (spam/irrelevant)
                    const status = replyText.toUpperCase().trim() === 'SKIP' ? 'skipped' : 'draft';

                    if (status === 'skipped') {
                        result.skipped++;
                    } else {
                        result.generated++;
                    }

                    // Insert into DB
                    await supabase.from('social_comment_replies').upsert(
                        {
                            post_id: post.id,
                            platform: platformName,
                            platform_post_id: platformPostId as string,
                            comment_id: comment.comment_id,
                            comment_text: comment.text,
                            comment_author: comment.author,
                            comment_date: comment.date,
                            reply_text: status === 'skipped' ? null : replyText,
                            status,
                            ai_model: aiModel,
                        },
                        { onConflict: 'platform,comment_id' },
                    );
                } catch (err: any) {
                    result.errors.push(
                        `Błąd AI dla komentarza ${comment.comment_id}: ${err.message}`,
                    );
                }
            }
        }
    }

    return result;
}

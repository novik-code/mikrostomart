import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/youtube/catalog — publiczny, read-only katalog filmów kanału dla apki.
 *
 * Czyta WYŁĄCZNIE z tabeli youtube_videos (mig 175), zasilanej cronem
 * youtube-sync. Zero odpytywania YouTube w ścieżce requestu → odporne na kwotę
 * API i jej awarie. Wzorzec z /api/articles (service_role, Cache-Control).
 *
 *   ?type=long|short|all   (domyślnie 'long' — bo RSS pokazywał tylko Shorty,
 *                           a pełne filmy były niedostępne)
 *   ?limit=1..50           (domyślnie 24)
 *   ?offset=0              (paginacja)
 *   ?q=fraza              (opcjonalny filtr po tytule, ilike)
 *
 * Zwraca { success, videos:[{id,title,publishedAt,durationSeconds,isShort,
 * thumb,viewCount}], nextOffset|null, total }.
 *
 * Przy realnym błędzie DB zwraca 500 — apka łapie to i wraca do RSS (fallback).
 */

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;
// is_short jest już „efektywne": sync wpisuje do niego ewentualny
// is_short_override, więc endpoint filtruje płasko (bez zagnieżdżonego OR).

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const type = (searchParams.get('type') || 'long').toLowerCase();
    const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT),
    );
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
    const q = (searchParams.get('q') || '').trim();

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) {
        return NextResponse.json(
            { success: false, error: 'Supabase credentials missing' },
            { status: 500 },
        );
    }

    const supabase = createClient(supaUrl, supaKey);

    try {
        let query = supabase
            .from('youtube_videos')
            .select(
                'video_id, title, published_at, duration_seconds, is_short, thumb_medium, thumb_high, view_count',
                { count: 'exact' },
            );

        if (type === 'short') query = query.eq('is_short', true);
        else if (type === 'long') query = query.eq('is_short', false);
        // type === 'all' → bez filtra typu

        if (q) query = query.ilike('title', `%${q}%`);

        const { data, count, error } = await query
            .order('published_at', { ascending: false, nullsFirst: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[YouTube catalog] DB error:', error.message);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const videos = (data ?? []).map((r: any) => ({
            id: r.video_id,
            title: r.title,
            publishedAt: r.published_at,
            durationSeconds: r.duration_seconds,
            isShort: r.is_short,
            thumb: r.thumb_high || r.thumb_medium || null,
            viewCount: r.view_count,
        }));

        const total = count ?? videos.length;
        const nextOffset = offset + videos.length < total ? offset + videos.length : null;

        return NextResponse.json(
            { success: true, videos, nextOffset, total },
            { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' } },
        );
    } catch (err) {
        console.error('[YouTube catalog] Error:', err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}

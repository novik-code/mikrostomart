/**
 * Synchronizacja katalogu kanału YouTube do tabeli `youtube_videos` (mig 175).
 *
 * Woła YouTube Data API v3 (klucz YOUTUBE_API_KEY, kanał YOUTUBE_CHANNEL_ID) i
 * upsertuje wszystkie filmy kanału z czasem trwania → pozwala rozdzielić Shorty
 * od zwykłych filmów, czego RSS (15 pozycji, bez duration) nie umie.
 *
 * Koszt kwoty na pełny sync ≈ 1 (channels) + N stron (playlistItems, 1/strona) +
 * N stron (videos, 1/strona), przy ~938 filmach ≈ 40 jednostek z 10 000/dobę.
 * NIE UŻYWAĆ search.list (100 jednostek/stronę — zabiłoby kwotę).
 *
 * Uruchamiane przez cron /api/cron/youtube-sync. Nigdy w ścieżce requestu
 * użytkownika — apka czyta gotowy cache z /api/youtube/catalog.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Próg klasyfikacji Short w sekundach. YouTube podniósł limit Shortów do 3 min
 * (X 2024), więc <=60 s może błędnie zaklasyfikować nowsze Shorty jako filmy;
 * na tym kanale Shorty mają 13–54 s, więc 60 s jest bezpieczne. Ręczna korekta:
 * kolumna youtube_videos.is_short_override.
 */
export const SHORT_MAX_SECONDS = Number(process.env.YOUTUBE_SHORT_MAX_SECONDS ?? 60);

const API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YtVideoRow {
    video_id: string;
    title: string;
    description: string;
    published_at: string | null;
    duration_seconds: number;
    is_short: boolean;
    thumb_default: string | null;
    thumb_medium: string | null;
    thumb_high: string | null;
    view_count: number;
    synced_at: string;
}

export interface SyncResult {
    ok: boolean;
    total?: number;
    shorts?: number;
    longs?: number;
    quotaCost?: number;
    error?: string;
}

/** ISO-8601 duration (PT#H#M#S) → sekundy. */
export function parseIsoDuration(iso: string | undefined | null): number {
    if (!iso) return 0;
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
    if (!m) return 0;
    const [, h, min, s] = m;
    return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

async function fetchJson(url: string): Promise<any> {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
}

/**
 * Pełny sync: wszystkie filmy kanału → upsert do youtube_videos.
 * Zwraca podsumowanie; nigdy nie rzuca (błąd → { ok:false, error }).
 */
export async function syncYoutubeCatalog(): Promise<SyncResult> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    if (!apiKey || !channelId) {
        return { ok: false, error: 'YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID missing' };
    }

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) {
        return { ok: false, error: 'Supabase credentials missing' };
    }

    let quotaCost = 0;
    try {
        // 1. Uploads playlist id (może być też wyliczony UC→UU, ale wołanie jest pewne).
        const chan = await fetchJson(
            `${API_BASE}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
        );
        quotaCost += 1;
        const uploads: string | undefined =
            chan.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploads) {
            return { ok: false, error: 'uploads playlist not found', quotaCost };
        }

        // 2. Wszystkie videoId z uploads (strony po 50, pageToken).
        const videoIds: string[] = [];
        let pageToken = '';
        do {
            const page = await fetchJson(
                `${API_BASE}/playlistItems?part=contentDetails&playlistId=${uploads}` +
                    `&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`,
            );
            quotaCost += 1;
            for (const it of page.items ?? []) {
                const id = it?.contentDetails?.videoId;
                if (id) videoIds.push(id);
            }
            pageToken = page.nextPageToken ?? '';
        } while (pageToken);

        if (videoIds.length === 0) {
            return { ok: true, total: 0, shorts: 0, longs: 0, quotaCost };
        }

        // 3. Metadane w paczkach po 50 (duration/snippet/statistics).
        const now = new Date().toISOString();
        const rows: YtVideoRow[] = [];
        for (let i = 0; i < videoIds.length; i += 50) {
            const chunk = videoIds.slice(i, i + 50);
            const details = await fetchJson(
                `${API_BASE}/videos?part=contentDetails,snippet,statistics` +
                    `&id=${chunk.join(',')}&maxResults=50&key=${apiKey}`,
            );
            quotaCost += 1;
            for (const v of details.items ?? []) {
                const seconds = parseIsoDuration(v?.contentDetails?.duration);
                const th = v?.snippet?.thumbnails ?? {};
                rows.push({
                    video_id: v.id,
                    title: v?.snippet?.title ?? '',
                    description: v?.snippet?.description ?? '',
                    published_at: v?.snippet?.publishedAt ?? null,
                    duration_seconds: seconds,
                    is_short: seconds > 0 && seconds <= SHORT_MAX_SECONDS,
                    thumb_default: th.default?.url ?? null,
                    thumb_medium: th.medium?.url ?? null,
                    thumb_high: th.high?.url ?? null,
                    view_count: Number(v?.statistics?.viewCount ?? 0) || 0,
                    synced_at: now,
                });
            }
        }

        // 4. Upsert. is_short_override (kolumny nie dotykamy) trzyma ręczną korektę.
        const supabase = createClient(supaUrl, supaKey);
        for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200);
            const { error } = await supabase
                .from('youtube_videos')
                .upsert(batch as any, { onConflict: 'video_id' });
            if (error) {
                return { ok: false, error: `upsert: ${error.message}`, quotaCost };
            }
        }

        // 5. Zastosuj ręczne korekty: gdzie is_short_override ustawiony, wpisz go
        //    do is_short. Dzięki temu endpoint filtruje płasko po is_short (bez
        //    zagnieżdżonego OR), a korekta przeżywa każdy re-sync. Wierszy z
        //    override jest zwykle zero, więc to praktycznie no-op.
        const { data: overrides } = await supabase
            .from('youtube_videos')
            .select('video_id, is_short_override')
            .not('is_short_override', 'is', null);
        for (const o of (overrides ?? []) as Array<{ video_id: string; is_short_override: boolean }>) {
            await supabase
                .from('youtube_videos')
                .update({ is_short: o.is_short_override } as any)
                .eq('video_id', o.video_id);
        }

        const shorts = rows.filter((r) => r.is_short).length;
        return {
            ok: true,
            total: rows.length,
            shorts,
            longs: rows.length - shorts,
            quotaCost,
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            quotaCost,
        };
    }
}

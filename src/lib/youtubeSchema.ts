import { isDemoMode } from '@/lib/demoMode';
import { brand } from '@/lib/brandConfig';

/**
 * VideoObject schema dla feedu YouTube na homepage (2026-06-01).
 *
 * Server-side fetch realnych metadanych (w tym `uploadDate` = publishedAt) z YouTube
 * Data API — Google WYMAGA uploadDate dla VideoObject, więc NIE emitujemy schematu bez
 * niego (uniknięcie błędów GSC). Cache 24h (next revalidate). W pełni graceful: brak
 * API key / demo / błąd API → [] → brak schematu (może tylko pomóc, nigdy nie zaszkodzić).
 */
interface VideoMeta {
    id: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
    description: string;
}

export async function fetchYouTubeVideosForSchema(): Promise<VideoMeta[]> {
    if (isDemoMode) return [];
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
    if (!API_KEY || !CHANNEL_ID) return [];

    try {
        const chRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`,
            { next: { revalidate: 86400 } }
        );
        if (!chRes.ok) return [];
        const chData = await chRes.json();
        const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploads) return [];

        const plRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}&key=${API_KEY}&maxResults=6`,
            { next: { revalidate: 86400 } }
        );
        if (!plRes.ok) return [];
        const plData = await plRes.json();

        return (plData.items || [])
            .map((i: { snippet?: Record<string, unknown> }): VideoMeta => {
                const s = (i.snippet || {}) as Record<string, any>;
                return {
                    id: s.resourceId?.videoId || '',
                    title: s.title || '',
                    thumbnail: s.thumbnails?.high?.url || s.thumbnails?.medium?.url || '',
                    publishedAt: s.publishedAt || '',
                    description: s.description || '',
                };
            })
            .filter((v: VideoMeta) => v.id && v.publishedAt && v.thumbnail && v.title);
    } catch {
        return [];
    }
}

export function buildVideoObjectSchema(videos: VideoMeta[]) {
    return videos.map((v) => ({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: v.title,
        description: (v.description?.trim().slice(0, 500)) || `${v.title} — wideo edukacyjne kliniki ${brand.schemaName}.`,
        thumbnailUrl: v.thumbnail,
        uploadDate: v.publishedAt,
        contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
        embedUrl: `https://www.youtube.com/embed/${v.id}`,
        publisher: {
            '@type': 'Organization',
            name: brand.schemaName,
            url: brand.appUrl,
        },
    }));
}

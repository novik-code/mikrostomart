import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demoMode';
import { verifyAdmin } from '@/lib/auth';
import { syncYoutubeCatalog } from '@/lib/youtubeCatalog';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Cron: pełna synchronizacja katalogu YouTube → tabela youtube_videos (mig 175).
 * Harmonogram w vercel.json (dobowo). Zasila /api/youtube/catalog dla apki.
 *
 * Auth: Bearer CRON_SECRET (Vercel cron) LUB zalogowany admin (ręczne odpalenie
 * do zasiania tabeli po deployu). Wzorzec z /api/cron/daily-article.
 */
export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const adminUser = await verifyAdmin();
    if (!isCronAuth && !adminUser && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const result = await syncYoutubeCatalog();
    console.log('[cron:youtube-sync]', JSON.stringify(result));

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

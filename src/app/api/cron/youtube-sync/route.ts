import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demoMode';
import { verifyAdmin } from '@/lib/auth';
import { syncYoutubeCatalog } from '@/lib/youtubeCatalog';
import { requireAdmin } from '@/lib/authGuards';

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
    /**
     * 🔴 P-021: RĘCZNA GAŁĄŹ WYMAGA ROLI ADMIN, NIE SAMEJ SESJI.
     *
     * 🪤 Stało tu `verifyAdmin()`, które — wbrew nazwie — sprawdza WYŁĄCZNIE istnienie
     * sesji Supabase. Rolę sprawdza `requireAdmin` z `lib/authGuards`. Mylące imię
     * wystarczyło, żeby ten sam błąd powtórzył się w trzech trasach: każdy zalogowany
     * PRACOWNIK mógł odpalić generację artykułu przez OpenAI i sync YouTube.
     *
     * 🔴 Drugi defekt w tej samej linijce: warunek kończył się `&& NODE_ENV ===
     * 'production'`, więc poza produkcją bramki NIE BYŁO WCALE — w preview odpalał to
     * anonim. Dziś bramka działa w każdym środowisku.
     *
     * 🔑 Tor CRONA nietknięty: `Bearer CRON_SECRET` przechodzi jak dotąd, bo to nim
     * Vercel odpala harmonogram.
     */
    if (!isCronAuth) {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
    }

    const result = await syncYoutubeCatalog();
    console.log('[cron:youtube-sync]', JSON.stringify(result));

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

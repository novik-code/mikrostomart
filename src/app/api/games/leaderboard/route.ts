import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GAMES = ['prochnicozerca'];

// GET — ranking poczekalni. ?game=&period=today|week|all → top 20 wyników.
// Dla „today/week" deduplikujemy do najlepszego wyniku na pseudonim (klient-side po pobraniu).
export async function GET(request: NextRequest) {
    const game = request.nextUrl.searchParams.get('game') || '';
    const period = request.nextUrl.searchParams.get('period') || 'today';
    if (!GAMES.includes(game)) {
        return NextResponse.json({ error: 'Nieznana gra' }, { status: 400 });
    }

    try {
        let q = supabase
            .from('game_scores')
            .select('nickname, score, created_at')
            .eq('game', game)
            .order('score', { ascending: false })
            .limit(100);

        if (period === 'today') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            q = q.gte('created_at', start.toISOString());
        } else if (period === 'week') {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            q = q.gte('created_at', start.toISOString());
        }

        const { data, error } = await q;
        if (error) throw error;

        // najlepszy wynik na pseudonim, top 20
        const best = new Map<string, { nickname: string; score: number; createdAt: string }>();
        for (const r of data || []) {
            const cur = best.get(r.nickname);
            if (!cur || r.score > cur.score) best.set(r.nickname, { nickname: r.nickname, score: r.score, createdAt: r.created_at });
        }
        const leaderboard = Array.from(best.values()).sort((a, b) => b.score - a.score).slice(0, 20);

        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error('[Games leaderboard] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

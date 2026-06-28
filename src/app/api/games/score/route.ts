import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GAMES = ['prochnicozerca'];

// POST — zapis wyniku do rankingu poczekalni (bez logowania, pseudonim + wynik).
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const game = String(body?.game ?? '');
        const nickname = String(body?.nickname ?? '').trim().slice(0, 40);
        const score = Math.floor(Number(body?.score));

        if (!GAMES.includes(game)) {
            return NextResponse.json({ error: 'Nieznana gra' }, { status: 400 });
        }
        if (nickname.length < 1) {
            return NextResponse.json({ error: 'Brak pseudonimu' }, { status: 400 });
        }
        if (!Number.isFinite(score) || score < 0 || score > 1_000_000) {
            return NextResponse.json({ error: 'Nieprawidłowy wynik' }, { status: 400 });
        }

        const { error } = await supabase.from('game_scores').insert({ game, nickname, score });
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Games score] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 'zabkowo' — ranking serii mycia ze strefy dzieci (PLAN_ZABKOWO_2026-08-01).
// Pseudonim jest po stronie apki GENEROWANY (rankingNick), nigdy wpisywany przez dziecko.
const GAMES = ['prochnicozerca', 'zabkowo'];

// POST — zapis wyniku do rankingu poczekalni (bez logowania, pseudonim + wynik).
export async function POST(request: NextRequest) {
    try {
        /**
         * W6 — trasa jest PUBLICZNA i pisze do bazy bez logowania. Bez limitu jedna
         * pętla zapycha ranking poczekalni dowolną liczbą wpisów, a tabela rośnie
         * bez końca. `failClosed`, bo przy niedostępnej bazie licznik w pamięci
         * lambdy i tak niczego nie ogranicza (Vercel zwiela lambdy), a zapis
         * kosztuje — otwarty bar przy awarii to zła wymiana.
         */
        const ip = getClientIP(request);
        const rl = await checkRateLimit(`games-score:${ip}`, 10, 60_000, { failClosed: true });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Za dużo zgłoszeń wyniku. Spróbuj za chwilę.' },
                { status: 429, headers: { 'Retry-After': '60' } },
            );
        }

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

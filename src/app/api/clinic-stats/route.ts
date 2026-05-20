import { NextResponse } from 'next/server';
import { getLiveClinicStats } from '@/lib/clinicStatsApi';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

// Public endpoint dla sekcji TrustStats — zwraca real-time statystyki procedur
// z Prodentis (z fallback do hardcoded src/data/clinic-stats.ts).
//
// K-2c (2026-05-20) — zastępuje hardcoded `clinic-stats.ts` w komponencie
// TrustStats. Dane TYLKO agregowane (counts, no PII), bezpieczne do publicznej
// ekspozycji per Prodentis API docs ("publiczny, dane marketingowe, bez kwot").
//
// Cache strategy:
// - HTTP `s-maxage=3600` — Vercel edge cache 1h (rekomendacja Prodentis docs:
//   queries skanują 140k rekordów `zabiegi`, czas odpowiedzi 2-5s)
// - `stale-while-revalidate=86400` — serwuj stary cache do 24h podczas refresh
// - Rate limit 60 req/min per IP — chroni przed flood
//
// RODO:
// - Liczby agregowane (counts) — nie są PII
// - Brak nazwisk pacjentów, brak identifiers
// - Doctor name "Marcin Nowosielski" — public info (wszędzie na stronie)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
    // Rate limit: 60 req/min per IP (chroni endpoint przed flood mimo cache).
    const ip = getClientIP(request);
    const rl = await checkRateLimit(`clinic-stats:${ip}`, 60, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Try again later.' },
            {
                status: 429,
                headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
            }
        );
    }

    try {
        const stats = await getLiveClinicStats();

        return NextResponse.json(stats, {
            status: 200,
            headers: {
                // Vercel edge cache 1h + stale-while-revalidate 24h
                // (per Prodentis docs rekomendacji "minimum 1 godzina")
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                'X-Source': stats.source,
                'X-RateLimit-Remaining': String(rl.remaining),
            },
        });
    } catch (err) {
        // Defense in depth — getLiveClinicStats() już ma try/catch + fallback
        // ale w razie czego (nieoczekiwany throw) zwracamy 500
        console.error('[/api/clinic-stats] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch clinic stats' },
            { status: 500 }
        );
    }
}
